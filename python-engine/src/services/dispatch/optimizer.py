"""
Optimal battery dispatch engine using cvxpy Linear Programming.

Solves a Linear Program to find the optimal charge/discharge schedule
that minimizes total energy costs including peak shaving, battery wear,
and network transport tariffs.
"""

import time

import numpy as np
import cvxpy as cp
from dataclasses import dataclass


@dataclass
class DispatchResult:
    """Result of optimal dispatch optimization."""

    charge_kw: np.ndarray  # T values: charge power per interval (kW)
    discharge_kw: np.ndarray  # T values: discharge power per interval (kW)
    soc_kwh: np.ndarray  # T+1 values: state of charge (kWh)
    grid_import_kw: np.ndarray  # T values: net grid import (kW)
    optimal_peak_kw: float  # Optimal contracted peak (kW)
    total_energy_cost: float  # Total energy cost (EUR)
    total_peak_cost: float  # Peak tariff cost (EUR)
    total_cost: float  # Total (energy + peak)
    solver_status: str  # 'optimal', 'infeasible', etc.
    solve_time_seconds: float


def optimize_dispatch(
    demand_kw: np.ndarray,  # T values: demand per interval (kW)
    energy_price: np.ndarray,  # T values: price per kWh
    capacity_kwh: float,  # Battery energy capacity
    power_kw: float,  # Max charge/discharge power
    efficiency: float,  # Round-trip efficiency (sqrt applied to charge)
    depth_of_discharge: float = 0.9,  # Max DoD
    degradation_factor: float = 1.0,  # Remaining capacity fraction (0-1)
    transport_tariff_per_kw: float = 27.50,  # Network tariff EUR/kW/year
    degradation_cost_per_kwh: float = 0.01,  # Wear cost per kWh throughput
    self_discharge_rate: float = 0.001,  # Daily self-discharge fraction
    dt: float = 0.25,  # Hours per interval (0.25 = 15 min)
    initial_soc_fraction: float = 0.5,  # Initial SoC as fraction of usable capacity
    solver: str = "ECOS",  # ECOS is free and fast
    verbose: bool = False,
) -> DispatchResult:
    """
    Solve optimal battery dispatch using cvxpy Linear Programming.

    Formulation
    -----------
    Decision variables:
      charge[t]    >= 0  : charging power (kW) at each interval
      discharge[t] >= 0  : discharging power (kW) at each interval
      soc[t]       >= 0  : state of charge (kWh) at each time point (T+1)
      grid[t]            : net grid import (kW), can be negative (export)
      peak         >= 0  : contracted peak demand (kW), scalar

    Objective: Minimize total cost
      min  sum_t (energy_price[t] * grid[t] * dt)              # energy cost
         + peak * transport_tariff_per_kw                       # annual peak tariff
         + sum_t (charge[t] + discharge[t]) * degradation_cost * dt  # wear

    Constraints:
      grid[t] == demand[t] - discharge[t] + charge[t] / sqrt(eta)  # energy balance
      soc[t+1] == soc[t] * sd_factor + (charge[t]*sqrt(eta) - discharge[t]) * dt
      soc[t] >= capacity * (1 - DoD) * degradation_factor         # min SoC
      soc[t] <= capacity * degradation_factor                      # max SoC
      charge[t] <= power_kw                                        # max charge rate
      discharge[t] <= power_kw                                     # max discharge rate
      grid[t] <= peak                                              # peak constraint
      soc[0] == initial_soc, soc[T] == initial_soc                 # cyclicity

    Notes
    -----
    - sqrt(eta) is applied to charge so that the round-trip loss is split
      equally between charge and discharge paths.
    - Self-discharge is applied per interval as a multiplicative decay on SoC.
    - ECOS solver handles 35040 intervals (full year at 15-min) in ~2 seconds.
    - If the primary solver fails, the function falls back to SCS.
    - If all solvers fail, a zero-battery result is returned with the raw demand.

    Parameters
    ----------
    demand_kw : array of shape (T,)
        Electrical demand in kW for each interval.
    energy_price : array of shape (T,)
        Energy price in EUR/kWh for each interval.
    capacity_kwh : float
        Nameplate battery energy capacity in kWh.
    power_kw : float
        Maximum charge and discharge power in kW.
    efficiency : float
        Round-trip efficiency, e.g. 0.90 for 90%.
    depth_of_discharge : float
        Maximum depth of discharge as fraction, e.g. 0.9 = 90%.
    degradation_factor : float
        Remaining capacity fraction (1.0 = new, 0.8 = 80% health).
    transport_tariff_per_kw : float
        Network transport tariff in EUR/kW/year.
    degradation_cost_per_kwh : float
        Battery wear cost in EUR per kWh of throughput.
    self_discharge_rate : float
        Daily self-discharge as fraction of stored energy.
    dt : float
        Duration of each interval in hours (0.25 = 15 minutes).
    initial_soc_fraction : float
        Initial state of charge as fraction of usable capacity.
    solver : str
        Primary cvxpy solver name.
    verbose : bool
        Whether to print solver output.

    Returns
    -------
    DispatchResult
        Dataclass containing the full dispatch schedule and cost breakdown.
    """
    demand_kw = np.asarray(demand_kw, dtype=np.float64)
    energy_price = np.asarray(energy_price, dtype=np.float64)

    T = len(demand_kw)
    assert len(energy_price) == T, (
        f"demand_kw and energy_price must have same length, got {T} and {len(energy_price)}"
    )

    # --- Derived parameters ---
    charge_eff = np.sqrt(efficiency)

    # Self-discharge decay factor per interval.
    # Daily rate is spread across all intervals in one day (24 / dt intervals).
    intervals_per_day = 24.0 / dt
    sd_per_interval = 1.0 - (self_discharge_rate / intervals_per_day)

    # Usable capacity bounds
    usable_max = capacity_kwh * degradation_factor
    usable_min = capacity_kwh * (1.0 - depth_of_discharge) * degradation_factor

    # Initial SoC in kWh (fraction of usable range, offset from usable_min)
    initial_soc = usable_min + initial_soc_fraction * (usable_max - usable_min)

    # --- Decision variables ---
    charge = cp.Variable(T, nonneg=True)
    discharge = cp.Variable(T, nonneg=True)
    soc = cp.Variable(T + 1, nonneg=True)
    grid = cp.Variable(T)
    peak = cp.Variable(nonneg=True)

    # --- Objective ---
    # Energy cost: price per kWh times grid import per interval
    energy_cost = cp.sum(cp.multiply(energy_price, grid)) * dt

    # Peak demand charge: annual network tariff on peak import
    peak_cost = peak * transport_tariff_per_kw

    # Battery degradation / wear cost: proportional to total throughput
    wear_cost = cp.sum(charge + discharge) * degradation_cost_per_kwh * dt

    objective = cp.Minimize(energy_cost + peak_cost + wear_cost)

    # --- Constraints ---
    constraints = []

    # Energy balance: what the grid delivers = demand minus battery discharge
    # plus the power drawn for charging (charge power / charge_efficiency,
    # because we lose energy when charging, so we pull more from the grid).
    constraints.append(
        grid == demand_kw - discharge + charge / charge_eff
    )

    # SoC dynamics with self-discharge.
    # soc[t+1] = soc[t] * sd_factor + (charge[t] * charge_eff - discharge[t]) * dt
    # This keeps the formulation linear since sd_per_interval is a constant.
    constraints.append(
        soc[1:] == cp.multiply(sd_per_interval, soc[:-1])
        + (cp.multiply(charge_eff, charge) - discharge) * dt
    )

    # SoC bounds
    constraints.append(soc >= usable_min)
    constraints.append(soc <= usable_max)

    # Power rating limits
    constraints.append(charge <= power_kw)
    constraints.append(discharge <= power_kw)

    # Peak constraint: grid import at every interval must be <= peak variable
    constraints.append(grid <= peak)

    # Boundary conditions: start and end at the same SoC (cyclicity)
    constraints.append(soc[0] == initial_soc)
    constraints.append(soc[T] == initial_soc)

    # --- Solve ---
    problem = cp.Problem(objective, constraints)

    start = time.time()
    solved = False

    # Try primary solver first, then fall back to SCS
    for try_solver in [solver, "SCS"]:
        if solved:
            break
        try:
            problem.solve(solver=try_solver, verbose=verbose)
            if problem.status in ("optimal", "optimal_inaccurate"):
                solved = True
        except cp.SolverError:
            continue

    solve_time = time.time() - start

    # --- Build result ---
    if problem.status not in ("optimal", "optimal_inaccurate"):
        # Solver failed: return a no-battery baseline result
        baseline_peak = float(np.max(demand_kw))
        baseline_energy_cost = float(np.sum(demand_kw * energy_price * dt))
        baseline_peak_cost = float(baseline_peak * transport_tariff_per_kw)

        return DispatchResult(
            charge_kw=np.zeros(T),
            discharge_kw=np.zeros(T),
            soc_kwh=np.full(T + 1, initial_soc),
            grid_import_kw=demand_kw.copy(),
            optimal_peak_kw=baseline_peak,
            total_energy_cost=baseline_energy_cost,
            total_peak_cost=baseline_peak_cost,
            total_cost=baseline_energy_cost + baseline_peak_cost,
            solver_status=problem.status,
            solve_time_seconds=solve_time,
        )

    # Extract solution arrays and clip tiny numerical artefacts
    charge_val = np.clip(np.array(charge.value).flatten(), 0.0, None)
    discharge_val = np.clip(np.array(discharge.value).flatten(), 0.0, None)
    soc_val = np.clip(np.array(soc.value).flatten(), usable_min, usable_max)
    grid_val = np.array(grid.value).flatten()
    peak_val = float(peak.value)

    # Compute cost components from the actual solution values
    total_energy_cost = float(np.sum(grid_val * energy_price * dt))
    total_peak_cost = float(peak_val * transport_tariff_per_kw)

    return DispatchResult(
        charge_kw=charge_val,
        discharge_kw=discharge_val,
        soc_kwh=soc_val,
        grid_import_kw=grid_val,
        optimal_peak_kw=peak_val,
        total_energy_cost=total_energy_cost,
        total_peak_cost=total_peak_cost,
        total_cost=float(problem.value),
        solver_status=problem.status,
        solve_time_seconds=solve_time,
    )
