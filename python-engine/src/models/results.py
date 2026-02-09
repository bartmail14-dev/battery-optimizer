"""Result models for the battery investment optimizer.

This module contains every output / result model produced by the simulation
engine, sensitivity analysis, Monte Carlo, and advisory layers.
"""

from __future__ import annotations

from typing import Literal, Optional

import orjson
from pydantic import BaseModel, Field

from .financial import CashflowYear

# ============================================================================
# Building blocks
# ============================================================================


class PercentileTriplet(BaseModel):
    """P10 / P50 / P90 summary of a stochastic distribution."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    p10: float = Field(..., description="10th-percentile value (pessimistic).")
    p50: float = Field(..., description="50th-percentile value (median / base case).")
    p90: float = Field(..., description="90th-percentile value (optimistic).")


# ============================================================================
# Simulation detail
# ============================================================================


class HourlySimulationResult(BaseModel):
    """Single-hour output of the battery dispatch simulation."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    hour: int = Field(..., ge=0, le=8759, description="Hour index (0-8759).")
    consumption: float = Field(
        ..., description="Site consumption in kWh."
    )
    battery_charge: float = Field(
        ..., ge=0, description="Energy charged into the battery in kWh."
    )
    battery_discharge: float = Field(
        ..., ge=0, description="Energy discharged from the battery in kWh."
    )
    state_of_charge: float = Field(
        ..., ge=0, description="Battery state of charge at end of hour in kWh."
    )
    grid_import: float = Field(
        ..., description="Net energy imported from the grid in kWh."
    )
    grid_export: float = Field(
        default=0.0,
        ge=0,
        description="Net energy exported to the grid in kWh.",
    )
    cost_with_battery: float = Field(
        ..., description="Electricity cost for this hour with battery in EUR."
    )
    cost_without_battery: float = Field(
        ..., description="Electricity cost for this hour without battery in EUR."
    )


class MonthlyBreakdown(BaseModel):
    """Aggregated monthly results."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    month: int = Field(..., ge=1, le=12, description="Month number (1-12).")
    label: str = Field(
        ..., description="Human-readable month label (e.g. 'January')."
    )
    cost_without: float = Field(
        ..., description="Total electricity cost without battery in EUR."
    )
    cost_with: float = Field(
        ..., description="Total electricity cost with battery in EUR."
    )
    savings: float = Field(
        ..., description="Monthly savings (cost_without - cost_with) in EUR."
    )
    energy_charged: float = Field(
        ..., ge=0, description="Total energy charged into battery in kWh."
    )
    energy_discharged: float = Field(
        ..., ge=0, description="Total energy discharged from battery in kWh."
    )
    cycles: float = Field(
        ..., ge=0, description="Number of full-equivalent cycles this month."
    )


class AnnualSimulationResult(BaseModel):
    """Full-year simulation output."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    hourly_results: list[HourlySimulationResult] = Field(
        ..., description="8 760 hourly result records."
    )

    # -- Aggregate totals ----------------------------------------------------
    total_consumption_kwh: float = Field(
        ..., description="Total site consumption in kWh."
    )
    total_charged_kwh: float = Field(
        ..., ge=0, description="Total energy charged in kWh."
    )
    total_discharged_kwh: float = Field(
        ..., ge=0, description="Total energy discharged in kWh."
    )
    total_grid_import_kwh: float = Field(
        ..., description="Total grid import in kWh."
    )
    total_grid_export_kwh: float = Field(
        default=0.0, ge=0, description="Total grid export in kWh."
    )
    total_cost_with_battery: float = Field(
        ..., description="Annual cost with battery in EUR."
    )
    total_cost_without_battery: float = Field(
        ..., description="Annual cost without battery in EUR."
    )
    total_savings: float = Field(
        ..., description="Annual savings in EUR."
    )
    full_equivalent_cycles: float = Field(
        ..., ge=0, description="Total full-equivalent cycles for the year."
    )
    peak_demand_reduction_kw: float = Field(
        default=0.0,
        ge=0,
        description="Reduction in peak grid demand achieved in kW.",
    )


# ============================================================================
# Revenue & cost breakdowns
# ============================================================================


class RevenueStream(BaseModel):
    """Single revenue / savings stream."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    name: str = Field(
        ..., description="Revenue stream identifier."
    )
    annual_revenue: float = Field(
        ..., description="Estimated annual revenue / savings in EUR."
    )
    description: str = Field(
        default="", description="Human-readable explanation."
    )
    confidence: float = Field(
        default=0.8,
        ge=0,
        le=1,
        description="Confidence level (0-1) that this revenue is achievable.",
    )


class CapexBreakdown(BaseModel):
    """Decomposition of capital expenditure."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    battery: float = Field(
        ..., ge=0, description="Battery module cost in EUR."
    )
    installation: float = Field(
        ..., ge=0, description="Installation / integration cost in EUR."
    )
    other: float = Field(
        default=0.0,
        ge=0,
        description="Other CAPEX items (permitting, grid reinforcement, etc.) in EUR.",
    )
    total: float = Field(
        ..., ge=0, description="Total CAPEX in EUR."
    )


class AnnualOpex(BaseModel):
    """Annual operating-expenditure breakdown."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    maintenance: float = Field(
        default=0.0, ge=0, description="Maintenance cost in EUR/year."
    )
    insurance: float = Field(
        default=0.0, ge=0, description="Insurance cost in EUR/year."
    )
    energy_tax: float = Field(
        default=0.0, ge=0, description="Energy-tax cost in EUR/year."
    )
    ode: float = Field(
        default=0.0, ge=0, description="ODE surcharge cost in EUR/year."
    )
    network_cost: float = Field(
        default=0.0, ge=0, description="Network / grid cost in EUR/year."
    )
    total: float = Field(
        default=0.0, ge=0, description="Total annual OPEX in EUR."
    )


class CostBreakdown(BaseModel):
    """Full cost breakdown over the project lifetime."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    capex: CapexBreakdown = Field(
        ..., description="Capital-expenditure breakdown."
    )
    opex_per_year: AnnualOpex = Field(
        ..., description="Annual operating-expenditure breakdown."
    )
    replacement_costs: float = Field(
        default=0.0,
        ge=0,
        description="Total expected replacement costs in EUR (NPV).",
    )
    total_lifetime_cost: float = Field(
        default=0.0,
        ge=0,
        description="Total cost of ownership over the analysis horizon in EUR.",
    )


# ============================================================================
# Risk & sensitivity
# ============================================================================


class RiskItem(BaseModel):
    """Single entry in the risk matrix."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    id: str = Field(..., description="Unique risk identifier.")
    category: str = Field(
        ..., description="Risk category (e.g. 'technical', 'market', 'regulatory')."
    )
    description: str = Field(..., description="Risk description.")
    probability: int = Field(
        ..., ge=1, le=5, description="Probability score (1 = very low, 5 = very high)."
    )
    impact: int = Field(
        ..., ge=1, le=5, description="Impact score (1 = negligible, 5 = severe)."
    )
    score: int = Field(
        ...,
        ge=1,
        le=25,
        description="Overall risk score (probability x impact).",
    )
    mitigation: str = Field(
        default="",
        description="Recommended mitigation strategy.",
    )


class SensitivityVar(BaseModel):
    """Result of a one-at-a-time sensitivity sweep for a single variable."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    variable: str = Field(
        ..., description="Internal variable name that was varied."
    )
    label: str = Field(
        ..., description="Human-readable label for display."
    )
    low_value: float = Field(
        ..., description="Low-end input value used in the sweep."
    )
    base_value: float = Field(
        ..., description="Base-case input value."
    )
    high_value: float = Field(
        ..., description="High-end input value used in the sweep."
    )
    low_npv: float = Field(
        ..., description="NPV at the low-end value in EUR."
    )
    base_npv: float = Field(
        ..., description="NPV at the base-case value in EUR."
    )
    high_npv: float = Field(
        ..., description="NPV at the high-end value in EUR."
    )
    unit: str = Field(
        default="",
        description="Display unit of the variable (e.g. 'EUR/kWh', '%').",
    )
    flips_verdict: bool = Field(
        default=False,
        description=(
            "True if varying this parameter within the sweep range changes "
            "the GO/NO_GO verdict."
        ),
    )


class MonteCarloSummary(BaseModel):
    """Summary statistics from a Monte Carlo simulation."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    iterations: int = Field(
        ..., gt=0, description="Number of Monte Carlo iterations executed."
    )
    npv_distribution: list[float] = Field(
        ..., description="Raw NPV outcomes (one per iteration) in EUR."
    )
    npv: PercentileTriplet = Field(
        ..., description="NPV percentile triplet in EUR."
    )
    irr: PercentileTriplet = Field(
        ..., description="IRR percentile triplet (fraction)."
    )
    payback: PercentileTriplet = Field(
        ..., description="Simple-payback-period percentile triplet in years."
    )
    convergence_cv: float = Field(
        ...,
        ge=0,
        description=(
            "Coefficient of variation of the running NPV mean at "
            "termination. Lower is better; < 0.01 indicates convergence."
        ),
    )
    probability_positive_npv: float = Field(
        default=0.0,
        ge=0,
        le=1,
        description="Fraction of iterations with NPV > 0.",
    )


# ============================================================================
# Alternatives & financing
# ============================================================================


class AlternativeScenario(BaseModel):
    """An alternative battery sizing / configuration scenario."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    name: str = Field(..., description="Scenario label.")
    capacity_kwh: float = Field(..., gt=0, description="Battery capacity in kWh.")
    npv: PercentileTriplet = Field(..., description="NPV triplet in EUR.")
    payback: PercentileTriplet = Field(
        ..., description="Simple payback triplet in years."
    )
    description: str = Field(
        default="", description="Free-text scenario description."
    )


class FinancingOption(BaseModel):
    """Comparison of a financing structure."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    type: Literal["equity", "debt", "lease"] = Field(
        ..., description="Financing type."
    )
    npv: float = Field(..., description="NPV under this financing structure in EUR.")
    irr: float = Field(
        ..., description="Equity IRR under this financing structure."
    )
    monthly_payment: float = Field(
        default=0.0,
        ge=0,
        description="Monthly payment obligation (debt/lease) in EUR.",
    )
    total_cost: float = Field(
        ..., ge=0, description="Total cost of financing over the term in EUR."
    )
    description: str = Field(
        default="", description="Summary of the financing terms."
    )


class SizingResult(BaseModel):
    """Outcome of the battery-sizing optimization."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    optimal_capacity_kwh: float = Field(
        ..., gt=0, description="Recommended battery capacity in kWh."
    )
    optimal_power_kw: float = Field(
        ..., gt=0, description="Recommended inverter power in kW."
    )
    npv_at_optimal: float = Field(
        ..., description="NPV at the optimal sizing in EUR."
    )
    reasoning: str = Field(
        default="",
        description="Explanation of why this size was chosen.",
    )


# ============================================================================
# Scenario wrapper
# ============================================================================


class ScenarioResult(BaseModel):
    """Results for a named scenario (conservative / base / optimistic)."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    scenario: Literal["conservative", "base", "optimistic"] = Field(
        ..., description="Scenario label."
    )
    npv: float = Field(..., description="Net present value in EUR.")
    irr: float = Field(..., description="Internal rate of return (fraction).")
    simple_payback: float = Field(
        ..., ge=0, description="Simple payback period in years."
    )
    discounted_payback: float = Field(
        ..., ge=0, description="Discounted payback period in years."
    )
    annual_savings: float = Field(
        ..., description="Average annual savings in EUR."
    )
    total_savings: float = Field(
        ..., description="Undiscounted total savings over the horizon in EUR."
    )
    lcos: float = Field(
        ...,
        ge=0,
        description="Levelized cost of storage in EUR/kWh.",
    )


# ============================================================================
# Main calculation result
# ============================================================================


class PeakShavingResult(BaseModel):
    """Peak-shaving analysis output."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    original_peak_kw: float = Field(
        ..., ge=0, description="Original peak grid demand in kW."
    )
    new_peak_kw: float = Field(
        ..., ge=0, description="Peak grid demand after battery dispatch in kW."
    )
    reduction_kw: float = Field(
        ..., ge=0, description="Absolute peak reduction in kW."
    )
    reduction_percent: float = Field(
        ..., ge=0, le=100, description="Relative peak reduction in %."
    )
    annual_savings: float = Field(
        ..., ge=0, description="Annual network-tariff savings in EUR."
    )


class CalculationResult(BaseModel):
    """
    Complete output of the battery-investment calculation engine.

    Combines all metrics, simulation outputs, scenario results, and
    cash-flow projections into a single serializable object.
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    # -- Core financial metrics ----------------------------------------------
    npv: float = Field(..., description="Base-case net present value in EUR.")
    irr: float = Field(..., description="Base-case internal rate of return.")
    simple_payback_years: float = Field(
        ..., ge=0, description="Simple payback period in years."
    )
    discounted_payback_years: float = Field(
        ..., ge=0, description="Discounted payback period in years."
    )
    annual_savings: float = Field(
        ..., description="Average annual savings in EUR."
    )
    total_savings: float = Field(
        ..., description="Total undiscounted savings over the horizon in EUR."
    )
    lcos: float = Field(
        ..., ge=0, description="Levelized cost of storage in EUR/kWh."
    )
    roi: float = Field(
        ..., description="Return on investment (NPV / total CAPEX)."
    )

    # -- Investment amounts --------------------------------------------------
    total_capex: float = Field(
        ..., ge=0, description="Total capital expenditure in EUR."
    )
    total_opex_per_year: float = Field(
        ..., ge=0, description="Total annual operating expenditure in EUR."
    )

    # -- Detailed breakdowns -------------------------------------------------
    monthly_breakdown: list[MonthlyBreakdown] = Field(
        ..., description="12-month cost/savings breakdown."
    )
    scenario_results: list[ScenarioResult] = Field(
        ..., description="Conservative / base / optimistic scenario outputs."
    )
    simulation: AnnualSimulationResult = Field(
        ..., description="Full hourly simulation results."
    )
    peak_shaving: PeakShavingResult = Field(
        ..., description="Peak-shaving analysis."
    )
    cashflows: list[CashflowYear] = Field(
        ..., description="Year-by-year cash-flow projection."
    )

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_INDENT_2,
        )


# ============================================================================
# Top-level investment advisory
# ============================================================================


class InvestmentAdvisory(BaseModel):
    """
    Top-level investment advisory report.

    This is the final deliverable produced by the engine: a comprehensive,
    structured recommendation including stochastic analysis, risk
    assessment, subsidy eligibility, and alternative scenarios.
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    # -- Verdict -------------------------------------------------------------
    verdict: Literal["GO", "NO_GO", "CONDITIONAL"] = Field(
        ..., description="Overall investment recommendation."
    )
    verdict_explanation: str = Field(
        ..., description="Narrative justification for the verdict."
    )
    confidence_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Overall confidence in the recommendation (0-1).",
    )
    confidence_factors: list[str] = Field(
        default_factory=list,
        description="Key factors influencing confidence.",
    )

    # -- Executive-summary percentile triplets -------------------------------
    npv: PercentileTriplet = Field(
        ..., description="NPV percentile triplet in EUR."
    )
    irr: PercentileTriplet = Field(
        ..., description="IRR percentile triplet (fraction)."
    )
    simple_payback: PercentileTriplet = Field(
        ..., description="Simple payback percentile triplet in years."
    )
    annual_savings: PercentileTriplet = Field(
        ..., description="Annual-savings percentile triplet in EUR."
    )

    # -- Breakdowns ----------------------------------------------------------
    revenue_breakdown: list[RevenueStream] = Field(
        ..., description="Revenue-stream decomposition."
    )
    cost_breakdown: CostBreakdown = Field(
        ..., description="Full cost breakdown."
    )
    cashflow_projection: list[CashflowYear] = Field(
        ..., description="Year-by-year cash-flow projection."
    )

    # -- Risk & sensitivity --------------------------------------------------
    risk_matrix: list[RiskItem] = Field(
        ..., description="Categorized risk register."
    )
    sensitivity_analysis: list[SensitivityVar] = Field(
        ..., description="One-at-a-time sensitivity tornado data."
    )
    monte_carlo_summary: MonteCarloSummary = Field(
        ..., description="Monte Carlo simulation results."
    )

    # -- Subsidies -----------------------------------------------------------
    subsidy_checklist: list["SubsidyItemRef"] = Field(
        ..., description="Per-scheme eligibility checklist."
    )
    subsidy_dependency: float = Field(
        default=0.0,
        ge=0,
        le=1,
        description=(
            "Fraction of NPV that depends on subsidies (0-1). Higher "
            "values indicate greater reliance on government incentives."
        ),
    )

    # -- Sizing & alternatives -----------------------------------------------
    sizing_recommendation: SizingResult = Field(
        ..., description="Optimal sizing recommendation."
    )
    alternatives: list[AlternativeScenario] = Field(
        default_factory=list,
        description="Alternative sizing / configuration scenarios.",
    )
    financing_comparison: list[FinancingOption] = Field(
        default_factory=list,
        description="Financing-structure comparison.",
    )

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_INDENT_2,
        )


# -- Alias to avoid circular import issues ----------------------------------
# SubsidyItem is defined in subsidies.py; we re-use it here via a
# forward-reference-compatible alias.  At runtime the InvestmentAdvisory
# model simply expects the same shape.

class SubsidyItemRef(BaseModel):
    """Subsidy checklist item (mirrors subsidies.SubsidyItem)."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    name: str = Field(..., description="Subsidy scheme name.")
    eligible: bool = Field(..., description="Whether the project qualifies.")
    amount: float = Field(default=0.0, ge=0, description="Benefit in EUR.")
    conditions: list[str] = Field(
        default_factory=list, description="Eligibility conditions."
    )
    applied: bool = Field(
        default=False, description="Whether applied in base-case NPV."
    )
