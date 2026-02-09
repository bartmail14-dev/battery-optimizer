"""
Net Present Value, Internal Rate of Return, and Levelized Cost calculations.

These functions form the core of the discounted-cash-flow (DCF) analysis
used to evaluate battery energy storage system (BESS) investments.

References:
    - Brealey, Myers & Allen — "Principles of Corporate Finance"
    - Lazard — Levelized Cost of Storage Analysis (LCOS methodology)
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import brentq


def calculate_npv(cashflows: list[float], discount_rate: float) -> float:
    """
    Calculate Net Present Value.

    Parameters
    ----------
    cashflows : list[float]
        Year-by-year cash flows. ``cashflows[0]`` is year 0 (initial
        investment, typically negative). ``cashflows[1]`` is year 1, etc.
    discount_rate : float
        Annual discount rate as a fraction (e.g. 0.06 = 6 %).

    Returns
    -------
    float
        The Net Present Value in the same currency as the cash flows.

    Examples
    --------
    >>> calculate_npv([-100_000, 30_000, 30_000, 30_000, 30_000], 0.06)
    3960.47...
    """
    cf = np.asarray(cashflows, dtype=np.float64)
    years = np.arange(len(cf), dtype=np.float64)
    discount_factors = (1.0 + discount_rate) ** years
    return float(np.sum(cf / discount_factors))


def calculate_irr(cashflows: list[float], max_rate: float = 5.0) -> float:
    """
    Calculate Internal Rate of Return using Brent's method.

    The IRR is the discount rate at which the NPV of the cash-flow series
    equals zero.  The search interval is [-0.999, max_rate].

    Parameters
    ----------
    cashflows : list[float]
        Year-by-year cash flows (year 0 = investment, typically negative).
    max_rate : float
        Upper bound of the search interval for the root finder.
        Default is 5.0 (500 %).

    Returns
    -------
    float
        The IRR as a fraction (e.g. 0.08 = 8 %).
        Returns ``float('inf')`` if the solver does not converge within
        the given interval.
    """
    cf = np.asarray(cashflows, dtype=np.float64)

    # Trivial cases
    if len(cf) < 2:
        return float("inf")

    # If all cashflows have the same sign, no IRR exists
    if np.all(cf >= 0) or np.all(cf <= 0):
        return float("inf")

    def _npv_at_rate(rate: float) -> float:
        years = np.arange(len(cf), dtype=np.float64)
        return float(np.sum(cf / (1.0 + rate) ** years))

    try:
        irr = brentq(_npv_at_rate, -0.999, max_rate, xtol=1e-12, maxiter=1000)
        return float(irr)
    except (ValueError, RuntimeError):
        return float("inf")


def calculate_mirr(
    cashflows: list[float],
    finance_rate: float,
    reinvest_rate: float,
) -> float:
    """
    Calculate Modified Internal Rate of Return.

    MIRR addresses the reinvestment-rate assumption of standard IRR by
    explicitly separating the rate at which negative cash flows are financed
    and the rate at which positive cash flows are reinvested.

    Parameters
    ----------
    cashflows : list[float]
        Year-by-year cash flows (year 0 = investment, typically negative).
    finance_rate : float
        Rate used to discount negative cash flows to present value
        (cost of capital, e.g. 0.06).
    reinvest_rate : float
        Rate used to compound positive cash flows to the terminal year
        (e.g. 0.04).

    Returns
    -------
    float
        The MIRR as a fraction.  Returns ``float('inf')`` if negative-CF
        present value is zero.
    """
    cf = np.asarray(cashflows, dtype=np.float64)
    n = len(cf) - 1  # number of periods

    if n <= 0:
        return float("inf")

    years = np.arange(len(cf), dtype=np.float64)

    # Separate positive and negative cashflows
    positives = np.where(cf > 0, cf, 0.0)
    negatives = np.where(cf < 0, cf, 0.0)

    # Future value of positive cashflows compounded at reinvest_rate
    fv_positives = float(np.sum(positives * (1.0 + reinvest_rate) ** (n - years)))

    # Present value of negative cashflows discounted at finance_rate
    pv_negatives = float(np.sum(negatives / (1.0 + finance_rate) ** years))

    if pv_negatives == 0.0:
        return float("inf")

    # MIRR formula: (FV_pos / |PV_neg|) ^ (1/n) - 1
    ratio = fv_positives / abs(pv_negatives)

    if ratio < 0:
        return float("inf")

    mirr = ratio ** (1.0 / n) - 1.0
    return float(mirr)


def calculate_lcos(
    total_discharged_kwh: float,
    total_cost_npv: float,
) -> float:
    """
    Levelized Cost of Storage.

    LCOS represents the per-kWh cost of energy delivered by the storage
    system over its lifetime, analogous to LCOE for generation assets.

    Parameters
    ----------
    total_discharged_kwh : float
        Total energy discharged over the system lifetime in kWh (NPV-weighted
        or simple total, depending on methodology).
    total_cost_npv : float
        Net present value of all costs (capex + opex + replacement + losses)
        in EUR.

    Returns
    -------
    float
        LCOS in EUR/kWh.  Returns ``float('inf')`` if discharged energy is
        zero or negative.
    """
    if total_discharged_kwh <= 0:
        return float("inf")
    return total_cost_npv / total_discharged_kwh


def calculate_lcoe(
    total_energy_kwh: float,
    capex: float,
    annual_opex: float,
    years: int,
    discount_rate: float,
) -> float:
    """
    Levelized Cost of Energy.

    Calculates the constant per-kWh price that would make the NPV of
    revenues equal to the NPV of costs.

    Parameters
    ----------
    total_energy_kwh : float
        Annual energy production / throughput in kWh (assumed constant
        each year for simplification).
    capex : float
        Total upfront capital expenditure in EUR.
    annual_opex : float
        Annual operating expenditure in EUR (assumed constant in real terms).
    years : int
        Economic lifetime in years.
    discount_rate : float
        Annual discount rate as a fraction.

    Returns
    -------
    float
        LCOE in EUR/kWh.  Returns ``float('inf')`` if energy or years is
        zero or negative.
    """
    if total_energy_kwh <= 0 or years <= 0:
        return float("inf")

    # NPV of annual opex
    year_indices = np.arange(1, years + 1, dtype=np.float64)
    discount_factors = (1.0 + discount_rate) ** year_indices
    npv_opex = float(np.sum(annual_opex / discount_factors))

    # NPV of total costs
    total_cost_npv = capex + npv_opex

    # NPV of energy output (discounted kWh)
    npv_energy = float(np.sum(total_energy_kwh / discount_factors))

    if npv_energy <= 0:
        return float("inf")

    return total_cost_npv / npv_energy
