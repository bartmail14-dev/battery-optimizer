"""
Energie Investeringsaftrek (EIA) — Energy Investment Deduction.

The EIA allows businesses to deduct 45.5% of the eligible investment in
energy-efficient assets from their taxable profit, on top of the normal
depreciation. Battery energy storage systems (BESS) qualify under
Energielijst code 310101.

The actual cash benefit equals the fiscal deduction multiplied by the
applicable corporate tax rate (vennootschapsbelasting).

Source:
    RVO — https://www.rvo.nl/subsidies-financiering/eia
    Energielijst 2024 — https://www.rvo.nl/sites/default/files/2024-01/Energielijst-2024.pdf
    Belastingdienst — https://www.belastingdienst.nl/
"""

from __future__ import annotations

from src.constants.dutch_market import (
    CORPORATE_TAX_RATE_HIGH,
    EIA_ENERGIELIJST_CODE_BATTERY,
    EIA_MAX_TOTAL_DEDUCTION,
    EIA_MIN_INVESTMENT_PER_ASSET,
    EIA_PERCENTAGE,
    EIA_REPORTING_DEADLINE_MONTHS,
)


def calculate_eia(
    eligible_investment: float,
    corporate_tax_rate: float = CORPORATE_TAX_RATE_HIGH,
    eia_percentage: float = EIA_PERCENTAGE,
    min_investment: float = EIA_MIN_INVESTMENT_PER_ASSET,
    max_deduction: float = EIA_MAX_TOTAL_DEDUCTION,
) -> dict:
    """
    Calculate EIA tax deduction for a battery storage investment.

    EIA allows deduction of 45.5% of the eligible investment from taxable
    profit.  The actual cash benefit = deduction x corporate tax rate.

    Requirements:
    - Battery storage must be on the Energielijst (code 310101).
    - Minimum investment per asset: EUR 2,500.
    - Must be reported to RVO within 3 months after purchase order.

    Parameters
    ----------
    eligible_investment : float
        Total eligible investment amount in EUR.
    corporate_tax_rate : float
        Applicable corporate tax rate (default 25.8% for profit > EUR 200k).
    eia_percentage : float
        EIA deduction percentage (default 45.5% for 2024).
    min_investment : float
        Minimum investment per asset required for EIA eligibility.
    max_deduction : float
        Maximum total EIA deduction across all investments in a fiscal year.

    Returns
    -------
    dict
        eligible : bool
            Whether the investment meets EIA requirements.
        deduction : float
            The fiscal deduction amount (added to depreciation in tax return).
        cash_benefit : float
            Actual tax saving = deduction x corporate_tax_rate.
        energielijst_code : str
            Applicable Energielijst code for battery storage.
        conditions : list[str]
            Eligibility conditions and notes.

    Source
    ------
    RVO Energie-investeringsaftrek (EIA):
        https://www.rvo.nl/subsidies-financiering/eia
    """
    conditions: list[str] = [
        f"Battery storage must be listed on the Energielijst (code {EIA_ENERGIELIJST_CODE_BATTERY}).",
        f"Minimum investment per asset: EUR {min_investment:,.0f}.",
        f"Report investment to RVO within {EIA_REPORTING_DEADLINE_MONTHS} months after purchase order.",
        "Investment must concern new (not second-hand) assets.",
        "EIA cannot be combined with MIA for the same asset.",
    ]

    # --- Eligibility check ---------------------------------------------------
    if eligible_investment < min_investment:
        return {
            "eligible": False,
            "deduction": 0.0,
            "cash_benefit": 0.0,
            "energielijst_code": EIA_ENERGIELIJST_CODE_BATTERY,
            "conditions": conditions,
            "reason": (
                f"Investment EUR {eligible_investment:,.2f} is below the minimum "
                f"of EUR {min_investment:,.0f} per asset."
            ),
        }

    # --- Calculate deduction -------------------------------------------------
    raw_deduction = eligible_investment * eia_percentage
    deduction = min(raw_deduction, max_deduction)

    # --- Calculate cash benefit (actual tax saving) --------------------------
    cash_benefit = deduction * corporate_tax_rate

    capped = raw_deduction > max_deduction
    if capped:
        conditions.append(
            f"Deduction capped at EUR {max_deduction:,.0f} (annual maximum)."
        )

    return {
        "eligible": True,
        "deduction": round(deduction, 2),
        "cash_benefit": round(cash_benefit, 2),
        "energielijst_code": EIA_ENERGIELIJST_CODE_BATTERY,
        "eia_percentage": eia_percentage,
        "corporate_tax_rate": corporate_tax_rate,
        "conditions": conditions,
    }
