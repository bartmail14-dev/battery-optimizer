"""Dutch subsidy and fiscal incentive models for battery storage."""

from __future__ import annotations

from typing import Literal, Optional

import orjson
from pydantic import BaseModel, Field


class SubsidyConfig(BaseModel):
    """
    Configuration for Dutch subsidy and fiscal-incentive eligibility.

    Covers the main schemes relevant to battery energy storage:
    SDE++, EIA, MIA, VAMIL, KIA, and the Flex-E congestion pilot.
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    # -- SDE++ ---------------------------------------------------------------
    sde_eligible: bool = Field(
        default=False,
        description="Whether the project qualifies for SDE++ subsidy.",
    )
    sde_base_amount: float = Field(
        default=0.068,
        ge=0,
        description=(
            "SDE++ base amount (basisbedrag) in EUR/kWh. "
            "Default reflects a recent tender round."
        ),
    )

    # -- EIA (Energie-investeringsaftrek) ------------------------------------
    eia_percentage: float = Field(
        default=0.455,
        ge=0,
        le=1,
        description=(
            "EIA deduction percentage of qualifying investment. "
            "Default: 45.5 % (2024 rate)."
        ),
    )
    eia_max_deduction: float = Field(
        default=136_000_000,
        ge=0,
        description="Maximum EIA deduction in EUR (per tax year).",
    )

    # -- MIA (Milieu-investeringsaftrek) -------------------------------------
    mia_category: Optional[Literal["I", "II", "III"]] = Field(
        default=None,
        description=(
            "MIA category (I = 45 %, II = 36 %, III = 27 %). "
            "None means MIA is not applicable."
        ),
    )

    # -- VAMIL (Willekeurige afschrijving milieu-investeringen) --------------
    vamil_eligible: bool = Field(
        default=False,
        description="Whether VAMIL accelerated depreciation is applicable.",
    )

    # -- KIA (Kleinschaligheidsinvesteringsaftrek) ---------------------------
    kia_eligible: bool = Field(
        default=True,
        description=(
            "Whether the project qualifies for KIA (small-scale investment "
            "deduction). Applicable for investments between EUR 2 801 and "
            "EUR 387 580."
        ),
    )

    # -- Flex-E (congestion pilot) -------------------------------------------
    flex_e_eligible: bool = Field(
        default=False,
        description=(
            "Whether the site is in a congestion area eligible for the "
            "Flex-E incentive program."
        ),
    )

    # -- Helpers -------------------------------------------------------------
    @property
    def mia_percentage(self) -> float:
        """Return the MIA deduction percentage for the selected category."""
        mapping = {"I": 0.45, "II": 0.36, "III": 0.27}
        if self.mia_category is None:
            return 0.0
        return mapping[self.mia_category]

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_INDENT_2,
        )


class SubsidyItem(BaseModel):
    """Single subsidy / fiscal incentive line item in the results."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    name: str = Field(
        ...,
        description="Subsidy scheme name (e.g. 'SDE++', 'EIA').",
    )
    eligible: bool = Field(
        ...,
        description="Whether the project qualifies for this scheme.",
    )
    amount: float = Field(
        default=0.0,
        ge=0,
        description="Estimated total benefit in EUR over the analysis period.",
    )
    conditions: list[str] = Field(
        default_factory=list,
        description="List of conditions / caveats for this subsidy.",
    )
    applied: bool = Field(
        default=False,
        description="Whether this subsidy was applied in the base-case NPV.",
    )


class SubsidyResult(BaseModel):
    """Aggregated subsidy analysis results."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    items: list[SubsidyItem] = Field(
        default_factory=list,
        description="Per-scheme breakdown.",
    )
    total_subsidy_value: float = Field(
        default=0.0,
        ge=0,
        description="Sum of all applied subsidy benefits in EUR.",
    )
    total_tax_benefit: float = Field(
        default=0.0,
        ge=0,
        description="Sum of all fiscal-incentive benefits in EUR.",
    )
    total_benefit: float = Field(
        default=0.0,
        ge=0,
        description="Grand total (subsidies + tax benefits) in EUR.",
    )
