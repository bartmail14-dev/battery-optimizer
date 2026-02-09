"""
Heuristic battery dispatch engine.

Provides a simple rule-based dispatch as a fast fallback when cvxpy
is unavailable, for quick estimates, or as an initial feasible solution.

Strategy:
  - Compute a rolling daily mean price.
  - When the current price is below the mean, charge the battery.
  - When the current price is above the mean, discharge the battery.
  - Scale charge/discharge power by how far the price deviates from the mean.
  - Respect SoC limits and power ratings at every interval.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class HeuristicResult:
    """Result of heuristic dispatch."""

    dispatch_kw: np.ndarray  # T values: positive=charge, negative=discharge
    charge_kw: np.ndarray  # T values: charge power per interval (kW, >= 0)
    discharge_kw: np.ndarray  # T values: discharge power per interval (kW, >= 0)
    soc_kwh: np.ndarray  # T+1 values: state of charge (kWh)
    grid_import_kw: np.ndarray  # T values: net grid import (kW)
    peak_kw: float  # Resulting peak grid import (kW)
    total_energy_cost: float  # Total energy cost (EUR)


def heuristic_dispatch(
    demand_kw: np.ndarray,
    energy_price: np.ndarray,
    capacity_kwh: float,
    power_kw: float,
    efficiency: float,
    depth_of_discharge: float = 0.9,
    degradation_factor: float = 1.0,
    dt: float = 0.25,
    initial_soc_fraction: float = 0.5,
    price_window: Optional[int] = None,
) -> HeuristicResult:
    """
    Simple heuristic dispatch: charge when price is below the rolling mean,
    discharge when price is above the rolling mean.

    The charge/discharge power is scaled proportionally to the price deviation
    from the mean, clamped to the battery power rating and SoC limits.

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
        Maximum depth of discharge as fraction.
    degradation_factor : float
        Remaining capacity fraction (1.0 = new).
    dt : float
        Duration of each interval in hours (0.25 = 15 minutes).
    initial_soc_fraction : float
        Initial SoC as fraction of usable capacity range.
    price_window : int or None
        Number of intervals for the rolling price mean.
        None defaults to one day (24/dt intervals).

    Returns
    -------
    HeuristicResult
        Dataclass containing the dispatch schedule and resulting costs.
    """
    demand_kw = np.asarray(demand_kw, dtype=np.float64)
    energy_price = np.asarray(energy_price, dtype=np.float64)

    T = len(demand_kw)
    assert len(energy_price) == T, (
        f"demand_kw and energy_price must have same length, got {T} and {len(energy_price)}"
    )

    # --- Derived parameters ---
    charge_eff = np.sqrt(efficiency)
    intervals_per_day = int(24.0 / dt)

    if price_window is None:
        price_window = intervals_per_day

    # Usable capacity bounds
    usable_max = capacity_kwh * degradation_factor
    usable_min = capacity_kwh * (1.0 - depth_of_discharge) * degradation_factor
    usable_range = usable_max - usable_min

    # Initial SoC in kWh
    initial_soc = usable_min + initial_soc_fraction * usable_range

    # --- Compute rolling mean price ---
    # Use a centered rolling window; pad edges with the global mean.
    half_win = price_window // 2
    padded_price = np.pad(energy_price, (half_win, half_win), mode="edge")
    kernel = np.ones(price_window) / price_window
    rolling_mean = np.convolve(padded_price, kernel, mode="valid")[:T]

    # Price deviation: positive means price is above average (discharge),
    # negative means price is below average (charge).
    price_deviation = energy_price - rolling_mean

    # Normalize deviation to [-1, 1] range for power scaling.
    max_abs_dev = np.max(np.abs(price_deviation))
    if max_abs_dev > 1e-9:
        normalized_signal = price_deviation / max_abs_dev
    else:
        # All prices are the same: no arbitrage opportunity
        normalized_signal = np.zeros(T)

    # --- Simulate dispatch ---
    charge_out = np.zeros(T)
    discharge_out = np.zeros(T)
    soc = np.zeros(T + 1)
    soc[0] = initial_soc

    for t in range(T):
        if normalized_signal[t] < 0:
            # Price below average: charge
            # Scale power by how far below the mean we are
            desired_charge = power_kw * abs(normalized_signal[t])

            # Limit by power rating
            desired_charge = min(desired_charge, power_kw)

            # Limit by available room in battery
            room_kwh = usable_max - soc[t]
            max_charge_by_soc = room_kwh / (charge_eff * dt) if dt > 0 else 0.0
            actual_charge = min(desired_charge, max(max_charge_by_soc, 0.0))

            charge_out[t] = actual_charge
            soc[t + 1] = soc[t] + actual_charge * charge_eff * dt

        elif normalized_signal[t] > 0:
            # Price above average: discharge
            desired_discharge = power_kw * abs(normalized_signal[t])

            # Limit by power rating
            desired_discharge = min(desired_discharge, power_kw)

            # Limit by available energy in battery
            available_kwh = soc[t] - usable_min
            max_discharge_by_soc = available_kwh / dt if dt > 0 else 0.0
            actual_discharge = min(desired_discharge, max(max_discharge_by_soc, 0.0))

            discharge_out[t] = actual_discharge
            soc[t + 1] = soc[t] - actual_discharge * dt

        else:
            # Exactly at mean: do nothing
            soc[t + 1] = soc[t]

        # Clamp SoC to bounds (safety net for floating point)
        soc[t + 1] = np.clip(soc[t + 1], usable_min, usable_max)

    # --- Compute grid import ---
    # Grid must supply demand, plus charging losses, minus discharge output.
    # When charging: grid sees charge_power / charge_eff additional load.
    # When discharging: grid load is reduced by discharge_power.
    grid_import = demand_kw - discharge_out + charge_out / charge_eff

    # --- Dispatch schedule (positive = charge, negative = discharge) ---
    dispatch = charge_out - discharge_out

    # --- Cost metrics ---
    peak_kw = float(np.max(grid_import))
    total_energy_cost = float(np.sum(grid_import * energy_price * dt))

    return HeuristicResult(
        dispatch_kw=dispatch,
        charge_kw=charge_out,
        discharge_kw=discharge_out,
        soc_kwh=soc,
        grid_import_kw=grid_import,
        peak_kw=peak_kw,
        total_energy_cost=total_energy_cost,
    )


def peak_shaving_dispatch(
    demand_kw: np.ndarray,
    capacity_kwh: float,
    power_kw: float,
    efficiency: float,
    target_peak_kw: float,
    depth_of_discharge: float = 0.9,
    degradation_factor: float = 1.0,
    dt: float = 0.25,
    initial_soc_fraction: float = 0.5,
) -> HeuristicResult:
    """
    Greedy peak-shaving heuristic: discharge when demand exceeds target_peak_kw,
    charge when demand is below and battery is not full.

    This is a simpler alternative focused purely on reducing peak demand rather
    than price arbitrage.

    Parameters
    ----------
    demand_kw : array of shape (T,)
        Electrical demand in kW for each interval.
    capacity_kwh : float
        Nameplate battery energy capacity in kWh.
    power_kw : float
        Maximum charge and discharge power in kW.
    efficiency : float
        Round-trip efficiency.
    target_peak_kw : float
        Desired maximum grid import in kW.
    depth_of_discharge : float
        Maximum depth of discharge as fraction.
    degradation_factor : float
        Remaining capacity fraction.
    dt : float
        Duration of each interval in hours.
    initial_soc_fraction : float
        Initial SoC as fraction of usable capacity range.

    Returns
    -------
    HeuristicResult
        Dataclass containing the dispatch schedule.
    """
    demand_kw = np.asarray(demand_kw, dtype=np.float64)

    T = len(demand_kw)

    charge_eff = np.sqrt(efficiency)

    usable_max = capacity_kwh * degradation_factor
    usable_min = capacity_kwh * (1.0 - depth_of_discharge) * degradation_factor
    usable_range = usable_max - usable_min

    initial_soc = usable_min + initial_soc_fraction * usable_range

    charge_out = np.zeros(T)
    discharge_out = np.zeros(T)
    soc = np.zeros(T + 1)
    soc[0] = initial_soc

    for t in range(T):
        excess = demand_kw[t] - target_peak_kw

        if excess > 0:
            # Demand exceeds target: discharge to shave the peak
            desired_discharge = min(excess, power_kw)

            available_kwh = soc[t] - usable_min
            max_discharge_by_soc = available_kwh / dt if dt > 0 else 0.0
            actual_discharge = min(desired_discharge, max(max_discharge_by_soc, 0.0))

            discharge_out[t] = actual_discharge
            soc[t + 1] = soc[t] - actual_discharge * dt

        else:
            # Demand below target: opportunity to charge
            headroom = target_peak_kw - demand_kw[t]
            # Charge power limited by headroom (so we don't exceed target),
            # power rating, and available room in battery.
            desired_charge = min(headroom * charge_eff, power_kw)
            desired_charge = max(desired_charge, 0.0)

            room_kwh = usable_max - soc[t]
            max_charge_by_soc = room_kwh / (charge_eff * dt) if dt > 0 else 0.0
            actual_charge = min(desired_charge, max(max_charge_by_soc, 0.0))

            charge_out[t] = actual_charge
            soc[t + 1] = soc[t] + actual_charge * charge_eff * dt

        soc[t + 1] = np.clip(soc[t + 1], usable_min, usable_max)

    # Grid import
    grid_import = demand_kw - discharge_out + charge_out / charge_eff

    dispatch = charge_out - discharge_out
    peak_kw_result = float(np.max(grid_import))

    # No energy price provided, so cost is zero
    return HeuristicResult(
        dispatch_kw=dispatch,
        charge_kw=charge_out,
        discharge_kw=discharge_out,
        soc_kwh=soc,
        grid_import_kw=grid_import,
        peak_kw=peak_kw_result,
        total_energy_cost=0.0,
    )
