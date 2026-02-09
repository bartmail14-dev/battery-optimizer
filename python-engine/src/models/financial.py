"""Financial analysis parameters and cash-flow models."""

from __future__ import annotations

import orjson
from pydantic import BaseModel, Field


class FinancialParams(BaseModel):
    """
    Parameters governing the discounted-cash-flow (DCF) analysis.

    All rates are expressed as fractions (e.g. 0.06 = 6 %).
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    discount_rate: float = Field(
        ...,
        ge=0,
        le=1,
        description=(
            "Weighted-average cost of capital (WACC) used to discount "
            "future cash flows. Example: 0.06 = 6 %."
        ),
    )
    inflation_rate: float = Field(
        ...,
        ge=0,
        le=1,
        description="Expected annual inflation rate. Example: 0.025 = 2.5 %.",
    )
    electricity_price_growth_rate: float = Field(
        ...,
        ge=-1,
        le=1,
        description=(
            "Expected annual growth of electricity prices (real, above "
            "inflation). Example: 0.03 = 3 %."
        ),
    )
    years: int = Field(
        ...,
        gt=0,
        description="Analysis horizon in years. Typical value: 15.",
    )
    corporate_tax_rate: float = Field(
        default=0.258,
        ge=0,
        le=1,
        description=(
            "Applicable corporate income-tax rate (vennootschapsbelasting). "
            "Default is 25.8 % (NL 2024)."
        ),
    )

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_INDENT_2,
        )


class CashflowYear(BaseModel):
    """Single-year row in a multi-year cash-flow projection."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    year: int = Field(
        ...,
        ge=0,
        description="Year index (0 = investment year).",
    )

    # -- Revenue streams -----------------------------------------------------
    revenue_peak_shaving: float = Field(
        default=0.0,
        description="Annual savings from peak-shaving in EUR.",
    )
    revenue_energy_arbitrage: float = Field(
        default=0.0,
        description="Annual revenue from energy arbitrage in EUR.",
    )
    revenue_imbalance: float = Field(
        default=0.0,
        description="Annual revenue from imbalance-market participation in EUR.",
    )
    revenue_fcr: float = Field(
        default=0.0,
        description="Annual revenue from FCR (frequency containment reserve) in EUR.",
    )
    revenue_feed_in: float = Field(
        default=0.0,
        description="Annual revenue from feed-in tariff in EUR.",
    )
    revenue_subsidy: float = Field(
        default=0.0,
        description="Annual subsidy income (SDE++, etc.) in EUR.",
    )
    revenue_tax_benefit: float = Field(
        default=0.0,
        description="Annual tax benefit (EIA, MIA, KIA) in EUR.",
    )
    revenue_total: float = Field(
        default=0.0,
        description="Total annual revenue in EUR.",
    )

    # -- Cost items ----------------------------------------------------------
    cost_maintenance: float = Field(
        default=0.0,
        description="Annual maintenance cost in EUR.",
    )
    cost_insurance: float = Field(
        default=0.0,
        description="Annual insurance cost in EUR.",
    )
    cost_energy_losses: float = Field(
        default=0.0,
        description="Cost of round-trip energy losses in EUR.",
    )
    cost_replacement: float = Field(
        default=0.0,
        description="Replacement cost incurred this year in EUR.",
    )
    cost_total: float = Field(
        default=0.0,
        description="Total annual cost in EUR.",
    )

    # -- Net / cumulative ----------------------------------------------------
    net_cashflow: float = Field(
        default=0.0,
        description="Net cash flow for this year (revenue - cost) in EUR.",
    )
    cumulative_cashflow: float = Field(
        default=0.0,
        description="Cumulative undiscounted cash flow up to this year in EUR.",
    )
    discounted_cashflow: float = Field(
        default=0.0,
        description="Present value of this year's net cash flow in EUR.",
    )
    cumulative_discounted_cashflow: float = Field(
        default=0.0,
        description="Cumulative discounted cash flow up to this year in EUR.",
    )
