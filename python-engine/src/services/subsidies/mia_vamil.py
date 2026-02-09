"""
MIA (Milieu-investeringsaftrek) + VAMIL (Vrije Afschrijving Milieu-investeringen).

MIA provides an extra tax deduction for environmentally friendly investments.
VAMIL allows accelerated depreciation: 75% can be written off in year 1.

Battery storage may qualify under Milieulijst code F 3240.

MIA and VAMIL can be combined with each other but MIA cannot be combined
with EIA for the same asset.

Sources:
    RVO MIA/VAMIL — https://www.rvo.nl/subsidies-financiering/mia-vamil
    Milieulijst 2024 — https://www.rvo.nl/sites/default/files/2024-01/Milieulijst-2024.pdf
    Belastingdienst — https://www.belastingdienst.nl/
"""

from __future__ import annotations

from src.constants.dutch_market import (
    CORPORATE_TAX_RATE_HIGH,
    MIA_CATEGORIES,
    MIA_MILIEULIJST_CODE_BATTERY,
    MIA_MIN_INVESTMENT_PER_ASSET,
    VAMIL_ACCELERATED_FRACTION,
    VAMIL_DISCOUNT_RATE,
    VAMIL_REMAINING_FRACTION,
)


def calculate_mia(
    eligible_investment: float,
    category: str | None = None,
    corporate_tax_rate: float = CORPORATE_TAX_RATE_HIGH,
) -> dict:
    """
    Calculate MIA (Milieu-investeringsaftrek) for a battery storage investment.

    MIA provides an extra tax deduction on top of normal depreciation for
    investments that appear on the Milieulijst. Battery storage systems may
    qualify under code F 3240.

    Categories and deduction percentages:
    - Category I:   45% of eligible investment
    - Category II:  36% of eligible investment
    - Category III: 27% of eligible investment

    If no category is supplied, the function defaults to Category II, which
    is the most common classification for battery storage.

    Parameters
    ----------
    eligible_investment : float
        Total eligible investment amount in EUR.
    category : str or None
        MIA category ('I', 'II', or 'III'). Defaults to 'II' if None.
    corporate_tax_rate : float
        Applicable corporate tax rate (default 25.8%).

    Returns
    -------
    dict
        eligible : bool
        category : str
        mia_percentage : float
        deduction : float
        cash_benefit : float
        milieulijst_code : str
        conditions : list[str]

    Source
    ------
    RVO MIA/VAMIL:
        https://www.rvo.nl/subsidies-financiering/mia-vamil
    """
    # Default to Category II (most common for BESS)
    if category is None:
        category = "II"

    valid_categories = set(MIA_CATEGORIES.keys())
    conditions: list[str] = [
        f"Asset must be on the Milieulijst (code {MIA_MILIEULIJST_CODE_BATTERY}).",
        f"Minimum investment per asset: EUR {MIA_MIN_INVESTMENT_PER_ASSET:,.0f}.",
        "Report to RVO within 3 months after purchase order.",
        "MIA cannot be combined with EIA for the same asset.",
        "MIA can be combined with VAMIL for the same asset.",
    ]

    # --- Validate category ---------------------------------------------------
    if category not in valid_categories:
        return {
            "eligible": False,
            "category": category,
            "mia_percentage": 0.0,
            "deduction": 0.0,
            "cash_benefit": 0.0,
            "milieulijst_code": MIA_MILIEULIJST_CODE_BATTERY,
            "conditions": conditions,
            "reason": (
                f"Invalid MIA category '{category}'. "
                f"Must be one of: {sorted(valid_categories)}."
            ),
        }

    # --- Eligibility check ---------------------------------------------------
    if eligible_investment < MIA_MIN_INVESTMENT_PER_ASSET:
        return {
            "eligible": False,
            "category": category,
            "mia_percentage": MIA_CATEGORIES[category],
            "deduction": 0.0,
            "cash_benefit": 0.0,
            "milieulijst_code": MIA_MILIEULIJST_CODE_BATTERY,
            "conditions": conditions,
            "reason": (
                f"Investment EUR {eligible_investment:,.2f} is below the minimum "
                f"of EUR {MIA_MIN_INVESTMENT_PER_ASSET:,.0f} per asset."
            ),
        }

    # --- Calculate deduction -------------------------------------------------
    mia_pct = MIA_CATEGORIES[category]
    deduction = eligible_investment * mia_pct
    cash_benefit = deduction * corporate_tax_rate

    return {
        "eligible": True,
        "category": category,
        "mia_percentage": mia_pct,
        "deduction": round(deduction, 2),
        "cash_benefit": round(cash_benefit, 2),
        "milieulijst_code": MIA_MILIEULIJST_CODE_BATTERY,
        "corporate_tax_rate": corporate_tax_rate,
        "conditions": conditions,
    }


def calculate_vamil(
    eligible_investment: float,
    lifespan_years: int,
    corporate_tax_rate: float = CORPORATE_TAX_RATE_HIGH,
) -> dict:
    """
    Calculate VAMIL (Vrije Afschrijving Milieu-investeringen) benefit.

    VAMIL allows accelerated depreciation: 75% of the investment can be
    written off in year 1, with the remaining 25% following the normal
    depreciation schedule. The benefit is the time-value-of-money advantage
    of earlier tax deductions compared to linear depreciation.

    The NPV benefit is computed by comparing:
    1. Normal linear depreciation over the asset's lifespan.
    2. VAMIL accelerated depreciation (75% year 1 + remaining linear).

    The difference in present value of tax shields, discounted at 6%, gives
    the economic benefit.

    Parameters
    ----------
    eligible_investment : float
        Total eligible investment amount in EUR.
    lifespan_years : int
        Expected economic lifespan of the asset in years.
    corporate_tax_rate : float
        Applicable corporate tax rate (default 25.8%).

    Returns
    -------
    dict
        eligible : bool
        normal_depreciation_per_year : float
        accelerated_year1 : float
        npv_benefit : float
            Net present value advantage of accelerated depreciation.
        discount_rate : float
        conditions : list[str]

    Source
    ------
    RVO MIA/VAMIL:
        https://www.rvo.nl/subsidies-financiering/mia-vamil
    """
    conditions: list[str] = [
        f"Asset must be on the Milieulijst (code {MIA_MILIEULIJST_CODE_BATTERY}).",
        "75% of the investment can be depreciated freely (typically year 1).",
        "The remaining 25% follows the normal depreciation schedule.",
        "VAMIL can be combined with MIA but NOT with EIA.",
        "Report to RVO within 3 months after purchase order.",
    ]

    # --- Eligibility check ---------------------------------------------------
    if eligible_investment < MIA_MIN_INVESTMENT_PER_ASSET:
        return {
            "eligible": False,
            "normal_depreciation_per_year": 0.0,
            "accelerated_year1": 0.0,
            "npv_benefit": 0.0,
            "discount_rate": VAMIL_DISCOUNT_RATE,
            "conditions": conditions,
            "reason": (
                f"Investment EUR {eligible_investment:,.2f} is below the minimum "
                f"of EUR {MIA_MIN_INVESTMENT_PER_ASSET:,.0f} per asset."
            ),
        }

    if lifespan_years < 1:
        return {
            "eligible": False,
            "normal_depreciation_per_year": 0.0,
            "accelerated_year1": 0.0,
            "npv_benefit": 0.0,
            "discount_rate": VAMIL_DISCOUNT_RATE,
            "conditions": conditions,
            "reason": "Lifespan must be at least 1 year.",
        }

    # --- Normal linear depreciation ------------------------------------------
    normal_dep_per_year = eligible_investment / lifespan_years

    # --- VAMIL accelerated depreciation schedule -----------------------------
    # Year 1: 75% of total investment
    accelerated_year1 = eligible_investment * VAMIL_ACCELERATED_FRACTION
    # Remaining 25% is spread linearly over the remaining lifespan
    remaining_amount = eligible_investment * VAMIL_REMAINING_FRACTION
    if lifespan_years > 1:
        remaining_dep_per_year = remaining_amount / (lifespan_years - 1)
    else:
        # If lifespan is 1 year, everything is in year 1 anyway
        remaining_dep_per_year = 0.0
        accelerated_year1 = eligible_investment

    # --- Calculate NPV of tax shields ----------------------------------------
    discount_rate = VAMIL_DISCOUNT_RATE

    # NPV of normal linear depreciation tax shields
    npv_normal = 0.0
    for year in range(1, lifespan_years + 1):
        tax_shield = normal_dep_per_year * corporate_tax_rate
        npv_normal += tax_shield / ((1 + discount_rate) ** year)

    # NPV of VAMIL accelerated depreciation tax shields
    npv_vamil = 0.0
    # Year 1: accelerated portion
    vamil_year1_dep = accelerated_year1
    if lifespan_years == 1:
        vamil_year1_dep = eligible_investment
    npv_vamil += (vamil_year1_dep * corporate_tax_rate) / (1 + discount_rate)

    # Years 2+: remaining linear depreciation
    if lifespan_years > 1:
        for year in range(2, lifespan_years + 1):
            tax_shield = remaining_dep_per_year * corporate_tax_rate
            npv_vamil += tax_shield / ((1 + discount_rate) ** year)

    # The benefit is the difference: earlier deductions have higher present value
    npv_benefit = npv_vamil - npv_normal

    return {
        "eligible": True,
        "normal_depreciation_per_year": round(normal_dep_per_year, 2),
        "accelerated_year1": round(accelerated_year1, 2),
        "remaining_per_year": round(remaining_dep_per_year, 2),
        "npv_normal_tax_shields": round(npv_normal, 2),
        "npv_vamil_tax_shields": round(npv_vamil, 2),
        "npv_benefit": round(npv_benefit, 2),
        "discount_rate": discount_rate,
        "corporate_tax_rate": corporate_tax_rate,
        "conditions": conditions,
    }
