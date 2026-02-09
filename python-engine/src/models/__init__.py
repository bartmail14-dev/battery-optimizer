"""Pydantic v2 models for the battery-optimizer Python engine.

All domain models are re-exported here for convenient top-level imports::

    from models import BatteryConfig, EnergyProfile, TariffStructure
"""

# -- Battery -----------------------------------------------------------------
from .battery import (
    BatteryConfig,
    DegradationConfig,
    DegradationModel,
)

# -- Energy profile ----------------------------------------------------------
from .profile import (
    EnergyProfile,
    Sector,
    HOURS_PER_YEAR,
    QUARTER_HOURS_PER_YEAR,
)

# -- Tariffs -----------------------------------------------------------------
from .tariffs import (
    NetworkOperator,
    TariffStructure,
)

# -- Financial ---------------------------------------------------------------
from .financial import (
    CashflowYear,
    FinancialParams,
)

# -- Subsidies ---------------------------------------------------------------
from .subsidies import (
    SubsidyConfig,
    SubsidyItem,
    SubsidyResult,
)

# -- Results -----------------------------------------------------------------
from .results import (
    AlternativeScenario,
    AnnualSimulationResult,
    CalculationResult,
    CapexBreakdown,
    AnnualOpex,
    CostBreakdown,
    FinancingOption,
    HourlySimulationResult,
    InvestmentAdvisory,
    MonteCarloSummary,
    MonthlyBreakdown,
    PeakShavingResult,
    PercentileTriplet,
    RevenueStream,
    RiskItem,
    ScenarioResult,
    SensitivityVar,
    SizingResult,
    SubsidyItemRef,
)

# -- Market data -------------------------------------------------------------
from .market_data import (
    EPEXDayAhead,
    EPEXPrice,
    GridTariff,
    ImbalancePrice,
    TennetBalancing,
)

__all__ = [
    # battery
    "BatteryConfig",
    "DegradationConfig",
    "DegradationModel",
    # profile
    "EnergyProfile",
    "Sector",
    "HOURS_PER_YEAR",
    "QUARTER_HOURS_PER_YEAR",
    # tariffs
    "NetworkOperator",
    "TariffStructure",
    # financial
    "CashflowYear",
    "FinancialParams",
    # subsidies
    "SubsidyConfig",
    "SubsidyItem",
    "SubsidyResult",
    # results
    "AlternativeScenario",
    "AnnualSimulationResult",
    "CalculationResult",
    "CapexBreakdown",
    "AnnualOpex",
    "CostBreakdown",
    "FinancingOption",
    "HourlySimulationResult",
    "InvestmentAdvisory",
    "MonteCarloSummary",
    "MonthlyBreakdown",
    "PeakShavingResult",
    "PercentileTriplet",
    "RevenueStream",
    "RiskItem",
    "ScenarioResult",
    "SensitivityVar",
    "SizingResult",
    "SubsidyItemRef",
    # market data
    "EPEXDayAhead",
    "EPEXPrice",
    "GridTariff",
    "ImbalancePrice",
    "TennetBalancing",
]
