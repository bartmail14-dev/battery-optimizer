"""
SDE++ — Stimulering Duurzame Energieproductie en Klimaattransitie.

The SDE++ is an operational subsidy that covers the gap between the cost
of producing sustainable energy (or reducing CO2) and the market price.
For battery storage, it provides a per-kWh subsidy for 15 years.

Annual subsidy = (base_amount - correction_amount) x capacity x full_load_hours

The correction amount is adjusted annually based on actual energy market prices,
so the effective subsidy varies year to year.

Source:
    RVO SDE++ — https://www.rvo.nl/subsidies-financiering/sde
    Aanwijzingsregeling SDE++ — https://wetten.overheid.nl/
"""

from __future__ import annotations

from src.constants.dutch_market import (
    DEFAULT_DISCOUNT_RATE,
    SDE_BASE_AMOUNT_BATTERY,
    SDE_CORRECTION_AMOUNT_DEFAULT,
    SDE_DURATION_YEARS,
    SDE_MIN_FULL_LOAD_HOURS,
)


def calculate_sde(
    capacity_kwh: float,
    annual_full_load_hours: float,
    base_amount: float = SDE_BASE_AMOUNT_BATTERY,
    correction_amount: float = SDE_CORRECTION_AMOUNT_DEFAULT,
    duration_years: int = SDE_DURATION_YEARS,
    min_full_load_hours: int = SDE_MIN_FULL_LOAD_HOURS,
    discount_rate: float = DEFAULT_DISCOUNT_RATE,
) -> dict:
    """
    Calculate SDE++ operational subsidy for battery storage.

    The SDE++ provides a per-kWh subsidy for the difference between the
    'base amount' (cost of sustainable production) and the 'correction
    amount' (approximation of market revenue). The subsidy runs for 15
    years from the date of commissioning.

    A minimum number of full load hours per year must be achieved; if the
    battery operates below this threshold, no subsidy is received for that
    year.

    Parameters
    ----------
    capacity_kwh : float
        Battery storage capacity in kWh.
    annual_full_load_hours : float
        Expected annual full load hours (e.g., 2 cycles/day x 365 = 730).
    base_amount : float
        SDE++ base amount in EUR/kWh (set per opening round).
    correction_amount : float
        Correction amount in EUR/kWh (adjusted annually by RVO).
    duration_years : int
        SDE++ subsidy duration in years (default 15).
    min_full_load_hours : int
        Minimum full load hours per year to qualify for SDE++.
    discount_rate : float
        Discount rate for NPV calculation (default 6%).

    Returns
    -------
    dict
        eligible : bool
        effective_rate_per_kwh : float
            Net subsidy rate = base_amount - correction_amount.
        annual_production_kwh : float
            capacity x full_load_hours.
        annual_subsidy : float
            Annual subsidy amount in EUR.
        total_subsidy_nominal : float
            Total undiscounted subsidy over the full duration.
        total_subsidy_npv : float
            Net present value of the subsidy stream.
        duration_years : int
        conditions : list[str]

    Source
    ------
    RVO SDE++:
        https://www.rvo.nl/subsidies-financiering/sde
    """
    conditions: list[str] = [
        f"Minimum {min_full_load_hours} full load hours per year required.",
        "Subsidy is per kWh of discharged energy (not capacity).",
        f"Subsidy runs for {duration_years} years from commissioning.",
        "Correction amount is adjusted annually based on market prices.",
        "Must apply during an SDE++ opening round and be awarded.",
        "Subject to 'bankability' check and production obligation.",
        "Battery must be connected to the public grid.",
    ]

    # --- Eligibility check ---------------------------------------------------
    if annual_full_load_hours < min_full_load_hours:
        return {
            "eligible": False,
            "effective_rate_per_kwh": 0.0,
            "annual_production_kwh": 0.0,
            "annual_subsidy": 0.0,
            "total_subsidy_nominal": 0.0,
            "total_subsidy_npv": 0.0,
            "duration_years": duration_years,
            "conditions": conditions,
            "reason": (
                f"Annual full load hours ({annual_full_load_hours:,.0f}) are below "
                f"the minimum requirement of {min_full_load_hours} hours."
            ),
        }

    if capacity_kwh <= 0:
        return {
            "eligible": False,
            "effective_rate_per_kwh": 0.0,
            "annual_production_kwh": 0.0,
            "annual_subsidy": 0.0,
            "total_subsidy_nominal": 0.0,
            "total_subsidy_npv": 0.0,
            "duration_years": duration_years,
            "conditions": conditions,
            "reason": "Battery capacity must be greater than zero.",
        }

    # --- Calculate subsidy ---------------------------------------------------
    effective_rate = base_amount - correction_amount

    # If correction amount exceeds base amount, effective rate is zero
    # (SDE++ never results in a payment from operator to government)
    if effective_rate < 0:
        effective_rate = 0.0
        conditions.append(
            "Correction amount exceeds base amount; effective subsidy is zero. "
            "This can happen when market electricity prices are high."
        )

    annual_production_kwh = capacity_kwh * annual_full_load_hours
    annual_subsidy = effective_rate * annual_production_kwh
    total_subsidy_nominal = annual_subsidy * duration_years

    # NPV of the annual subsidy stream
    total_subsidy_npv = 0.0
    for year in range(1, duration_years + 1):
        total_subsidy_npv += annual_subsidy / ((1 + discount_rate) ** year)

    return {
        "eligible": True,
        "effective_rate_per_kwh": round(effective_rate, 4),
        "base_amount": base_amount,
        "correction_amount": correction_amount,
        "annual_production_kwh": round(annual_production_kwh, 2),
        "annual_subsidy": round(annual_subsidy, 2),
        "total_subsidy_nominal": round(total_subsidy_nominal, 2),
        "total_subsidy_npv": round(total_subsidy_npv, 2),
        "duration_years": duration_years,
        "discount_rate": discount_rate,
        "conditions": conditions,
    }
