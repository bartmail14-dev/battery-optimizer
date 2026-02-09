"""
Flex-e — Flexibility subsidy for grid congestion areas.

Flex-e provides a 35% investment subsidy (up to EUR 300,000) for
flexibility assets such as battery storage systems that are installed in
designated grid congestion areas. The programme aims to alleviate network
congestion by incentivising local flexibility.

Eligible grid operator areas: Liander, Stedin, Enexis (specific congestion
zones as designated by the programme).

Source:
    RVO Flex-e — https://www.rvo.nl/subsidies-financiering/flex-e
"""

from __future__ import annotations

from src.constants.dutch_market import (
    FLEX_E_ELIGIBLE_GRID_OPERATORS,
    FLEX_E_MAX_SUBSIDY,
    FLEX_E_PERCENTAGE,
)


def calculate_flex_e(
    eligible_investment: float,
    in_congestion_area: bool = False,
    flex_e_percentage: float = FLEX_E_PERCENTAGE,
    max_subsidy: float = FLEX_E_MAX_SUBSIDY,
) -> dict:
    """
    Calculate Flex-e subsidy for battery storage in grid congestion areas.

    Flex-e provides a direct investment subsidy of 35% for flexibility assets
    deployed in designated grid congestion areas. The subsidy is capped at
    EUR 300,000 per project.

    Unlike EIA/MIA (which are tax deductions), Flex-e is a direct cash
    subsidy that reduces the CAPEX.

    Parameters
    ----------
    eligible_investment : float
        Total eligible investment amount in EUR.
    in_congestion_area : bool
        Whether the project location is in a designated congestion area.
    flex_e_percentage : float
        Subsidy percentage of eligible investment (default 35%).
    max_subsidy : float
        Maximum subsidy amount per project (default EUR 300,000).

    Returns
    -------
    dict
        eligible : bool
        subsidy_amount : float
            Direct cash subsidy (capped at max_subsidy).
        subsidy_percentage : float
            Effective subsidy percentage after cap.
        conditions : list[str]

    Source
    ------
    RVO Flex-e:
        https://www.rvo.nl/subsidies-financiering/flex-e
    """
    grid_operators = ", ".join(FLEX_E_ELIGIBLE_GRID_OPERATORS)

    conditions: list[str] = [
        f"Project must be in a designated congestion area ({grid_operators}).",
        f"Maximum subsidy: EUR {max_subsidy:,.0f} per project.",
        "Battery must provide grid flexibility services (e.g., congestion management).",
        "Application during open Flex-e round required.",
        "Flex-e can be combined with EIA/MIA/KIA and SDE++.",
        "Project must be realised within 18 months after award.",
    ]

    # --- Eligibility check ---------------------------------------------------
    if not in_congestion_area:
        return {
            "eligible": False,
            "subsidy_amount": 0.0,
            "subsidy_percentage": 0.0,
            "conditions": conditions,
            "reason": (
                "Project location is not in a designated grid congestion area. "
                f"Eligible areas are serviced by: {grid_operators}."
            ),
        }

    if eligible_investment <= 0:
        return {
            "eligible": False,
            "subsidy_amount": 0.0,
            "subsidy_percentage": 0.0,
            "conditions": conditions,
            "reason": "Eligible investment must be greater than zero.",
        }

    # --- Calculate subsidy ---------------------------------------------------
    raw_subsidy = eligible_investment * flex_e_percentage
    subsidy_amount = min(raw_subsidy, max_subsidy)

    # Effective percentage after cap
    effective_percentage = subsidy_amount / eligible_investment if eligible_investment > 0 else 0.0

    capped = raw_subsidy > max_subsidy
    if capped:
        conditions.append(
            f"Subsidy capped at EUR {max_subsidy:,.0f} "
            f"(uncapped would be EUR {raw_subsidy:,.2f})."
        )

    return {
        "eligible": True,
        "subsidy_amount": round(subsidy_amount, 2),
        "subsidy_percentage": round(effective_percentage, 4),
        "flex_e_nominal_percentage": flex_e_percentage,
        "conditions": conditions,
    }
