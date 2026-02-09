"""
Dutch energy market constants for battery storage investment analysis.

Sources:
- Belastingdienst: https://www.belastingdienst.nl/
- RVO (Rijksdienst voor Ondernemend Nederland): https://www.rvo.nl/
- SDE++ opening rounds: https://www.rvo.nl/subsidies-financiering/sde
- Energielijst / Milieulijst: https://www.rvo.nl/subsidies-financiering/eia
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Corporate tax rates (Vennootschapsbelasting) -- 2024/2025
# ---------------------------------------------------------------------------
CORPORATE_TAX_RATE_LOW: float = 0.190       # First EUR 200,000 taxable profit
CORPORATE_TAX_RATE_HIGH: float = 0.258      # Above EUR 200,000 taxable profit
CORPORATE_TAX_THRESHOLD: float = 200_000.0  # Threshold between low/high rate

# ---------------------------------------------------------------------------
# EIA — Energie Investeringsaftrek (2024/2025)
# Source: https://www.rvo.nl/subsidies-financiering/eia
# ---------------------------------------------------------------------------
EIA_PERCENTAGE: float = 0.455               # 45.5% deduction of eligible investment
EIA_MIN_INVESTMENT_PER_ASSET: float = 2_500.0
EIA_MAX_TOTAL_DEDUCTION: float = 136_000_000.0
EIA_ENERGIELIJST_CODE_BATTERY: str = "310101"  # Battery storage on Energielijst
EIA_REPORTING_DEADLINE_MONTHS: int = 3       # Must report to RVO within 3 months

# ---------------------------------------------------------------------------
# MIA — Milieu-investeringsaftrek (2024/2025)
# Source: https://www.rvo.nl/subsidies-financiering/mia-vamil
# ---------------------------------------------------------------------------
MIA_CATEGORIES: dict[str, float] = {
    "I": 0.45,    # Category I:  45% of eligible investment
    "II": 0.36,   # Category II: 36% of eligible investment
    "III": 0.27,  # Category III: 27% of eligible investment
}
MIA_MILIEULIJST_CODE_BATTERY: str = "F 3240"  # Battery storage on Milieulijst
MIA_MIN_INVESTMENT_PER_ASSET: float = 2_500.0

# ---------------------------------------------------------------------------
# VAMIL — Vrije Afschrijving Milieu-investeringen (2024/2025)
# Source: https://www.rvo.nl/subsidies-financiering/mia-vamil
# ---------------------------------------------------------------------------
VAMIL_ACCELERATED_FRACTION: float = 0.75    # 75% can be written off in year 1
VAMIL_REMAINING_FRACTION: float = 0.25      # Remaining 25% follows normal schedule
VAMIL_DISCOUNT_RATE: float = 0.06           # Assumed discount rate for NPV calc

# ---------------------------------------------------------------------------
# KIA — Kleinschaligheids-investeringsaftrek (2024)
# Source: https://www.belastingdienst.nl/wps/wcm/connect/nl/
#         ondernemers-en-zelfstandigen/content/kleinschaligheidsinvesteringsaftrek
# ---------------------------------------------------------------------------
KIA_BRACKETS: list[dict] = [
    # (lower, upper, type, value)
    {"lower": 2_801, "upper": 39_693, "type": "percentage", "value": 0.28},
    {"lower": 39_694, "upper": 110_998, "type": "percentage", "value": 0.15},
    {"lower": 110_999, "upper": 387_580, "type": "fixed", "value": 16_307.0},
]
KIA_MIN_INVESTMENT: float = 2_801.0
KIA_MAX_INVESTMENT: float = 387_580.0

# ---------------------------------------------------------------------------
# SDE++ — Stimulering Duurzame Energieproductie en Klimaattransitie
# Source: https://www.rvo.nl/subsidies-financiering/sde
# ---------------------------------------------------------------------------
SDE_DURATION_YEARS: int = 15
SDE_BASE_AMOUNT_BATTERY: float = 0.068      # EUR/kWh base amount for battery
SDE_CORRECTION_AMOUNT_DEFAULT: float = 0.035 # Correction amount (market price proxy)
SDE_MIN_FULL_LOAD_HOURS: int = 500           # Minimum full load hours per year

# ---------------------------------------------------------------------------
# Flex-e — Flexibility subsidy (grid congestion areas)
# Source: https://www.rvo.nl/subsidies-financiering/flex-e
# ---------------------------------------------------------------------------
FLEX_E_PERCENTAGE: float = 0.35             # 35% of eligible investment
FLEX_E_MAX_SUBSIDY: float = 300_000.0       # Maximum EUR 300,000 per project
FLEX_E_ELIGIBLE_GRID_OPERATORS: list[str] = [
    "Liander",
    "Stedin",
    "Enexis",
]

# ---------------------------------------------------------------------------
# General financial assumptions
# ---------------------------------------------------------------------------
DEFAULT_DISCOUNT_RATE: float = 0.06         # WACC / discount rate for NPV
HOURS_PER_YEAR: int = 8_760
