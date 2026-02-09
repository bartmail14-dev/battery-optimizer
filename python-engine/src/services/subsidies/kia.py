"""
Kleinschaligheids-investeringsaftrek (KIA) — Small-Scale Investment Deduction.

KIA is an additional tax deduction for businesses that invest between
EUR 2,801 and EUR 387,580 in a fiscal year. The deduction percentage or
fixed amount depends on the total annual investment.

KIA can be stacked with EIA, MIA, and other subsidies.

Source:
    Belastingdienst — https://www.belastingdienst.nl/wps/wcm/connect/nl/
        ondernemers-en-zelfstandigen/content/kleinschaligheidsinvesteringsaftrek
    2024 brackets apply.
"""

from __future__ import annotations

from src.constants.dutch_market import (
    CORPORATE_TAX_RATE_HIGH,
    KIA_BRACKETS,
    KIA_MAX_INVESTMENT,
    KIA_MIN_INVESTMENT,
)


def calculate_kia(
    total_investment: float,
    corporate_tax_rate: float = CORPORATE_TAX_RATE_HIGH,
) -> dict:
    """
    Calculate KIA (Kleinschaligheids-investeringsaftrek) for a fiscal year.

    KIA provides an additional tax deduction based on the total qualifying
    investments made in a single fiscal year. The deduction is applied on
    top of normal depreciation.

    2024 brackets:
    +-----------------------+----------------------------+
    | Total investment      | KIA deduction              |
    +-----------------------+----------------------------+
    | Below EUR 2,801       | No KIA                     |
    | EUR 2,801 - 39,693    | 28% of total investment    |
    | EUR 39,694 - 110,998  | 15% of total investment    |
    | EUR 110,999 - 387,580 | Fixed EUR 16,307           |
    | Above EUR 387,580     | No KIA                     |
    +-----------------------+----------------------------+

    Note: total_investment is the sum of ALL qualifying investments in the
    fiscal year, not just the battery investment. The caller should pass
    the total to get the correct bracket.

    Parameters
    ----------
    total_investment : float
        Total qualifying investments in the fiscal year in EUR.
    corporate_tax_rate : float
        Applicable corporate tax rate (default 25.8%).

    Returns
    -------
    dict
        eligible : bool
        bracket : str
            Description of the applicable bracket.
        deduction : float
            KIA deduction amount.
        cash_benefit : float
            Actual tax saving = deduction x corporate_tax_rate.
        conditions : list[str]

    Source
    ------
    Belastingdienst KIA:
        https://www.belastingdienst.nl/wps/wcm/connect/nl/
        ondernemers-en-zelfstandigen/content/kleinschaligheidsinvesteringsaftrek
    """
    conditions: list[str] = [
        "KIA applies to the TOTAL qualifying investments in a fiscal year.",
        f"Minimum total investment: EUR {KIA_MIN_INVESTMENT:,.0f}.",
        f"Maximum total investment: EUR {KIA_MAX_INVESTMENT:,.0f}.",
        "Investments must concern business assets (bedrijfsmiddelen).",
        "Assets costing less than EUR 450 do not count towards the total.",
        "KIA can be combined with EIA, MIA, and VAMIL.",
    ]

    # --- Below minimum -------------------------------------------------------
    if total_investment < KIA_MIN_INVESTMENT:
        return {
            "eligible": False,
            "bracket": f"Below EUR {KIA_MIN_INVESTMENT:,.0f}",
            "deduction": 0.0,
            "cash_benefit": 0.0,
            "conditions": conditions,
            "reason": (
                f"Total investment EUR {total_investment:,.2f} is below the "
                f"minimum of EUR {KIA_MIN_INVESTMENT:,.0f}."
            ),
        }

    # --- Above maximum -------------------------------------------------------
    if total_investment > KIA_MAX_INVESTMENT:
        return {
            "eligible": False,
            "bracket": f"Above EUR {KIA_MAX_INVESTMENT:,.0f}",
            "deduction": 0.0,
            "cash_benefit": 0.0,
            "conditions": conditions,
            "reason": (
                f"Total investment EUR {total_investment:,.2f} exceeds the "
                f"maximum of EUR {KIA_MAX_INVESTMENT:,.0f} for KIA eligibility."
            ),
        }

    # --- Find applicable bracket ---------------------------------------------
    deduction = 0.0
    bracket_description = ""

    for bracket in KIA_BRACKETS:
        if bracket["lower"] <= total_investment <= bracket["upper"]:
            if bracket["type"] == "percentage":
                deduction = total_investment * bracket["value"]
                pct_label = f"{bracket['value']:.0%}"
                bracket_description = (
                    f"EUR {bracket['lower']:,.0f} - {bracket['upper']:,.0f}: "
                    f"{pct_label} of investment"
                )
            elif bracket["type"] == "fixed":
                deduction = bracket["value"]
                bracket_description = (
                    f"EUR {bracket['lower']:,.0f} - {bracket['upper']:,.0f}: "
                    f"fixed EUR {bracket['value']:,.0f}"
                )
            break

    cash_benefit = deduction * corporate_tax_rate

    return {
        "eligible": True,
        "bracket": bracket_description,
        "deduction": round(deduction, 2),
        "cash_benefit": round(cash_benefit, 2),
        "corporate_tax_rate": corporate_tax_rate,
        "conditions": conditions,
    }
