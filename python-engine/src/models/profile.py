"""Energy consumption profile models."""

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

import orjson
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
HOURS_PER_YEAR: int = 8760
QUARTER_HOURS_PER_YEAR: int = 35040


class Sector(str, Enum):
    """Dutch commercial / industrial sectors for load-profile selection."""

    HOSPITALITY = "hospitality"
    HEALTHCARE = "healthcare"
    RETAIL = "retail"
    KANTOOR = "kantoor"
    INDUSTRIE = "industrie"
    LOGISTIEK = "logistiek"
    ONDERWIJS = "onderwijs"
    OVERIG = "overig"


class EnergyProfile(BaseModel):
    """
    Full-year energy consumption profile.

    The primary resolution is hourly (8 760 values).  An optional
    quarter-hourly series (35 040 values) can be supplied when the source
    data provides 15-minute intervals.
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    hourly_consumption_kwh: list[float] = Field(
        ...,
        min_length=HOURS_PER_YEAR,
        max_length=HOURS_PER_YEAR,
        description=(
            "Hourly electricity consumption in kWh for a full year "
            f"({HOURS_PER_YEAR} values, index 0 = 1 Jan 00:00)."
        ),
    )
    peak_demand_kw: float = Field(
        ...,
        gt=0,
        description="Observed peak demand in kW.",
    )
    annual_consumption_kwh: float = Field(
        ...,
        gt=0,
        description="Total annual electricity consumption in kWh.",
    )
    connection_capacity_kw: float = Field(
        ...,
        gt=0,
        description=(
            "Contracted grid connection capacity in kW "
            "(aansluitcapaciteit)."
        ),
    )
    sector: Sector = Field(
        ...,
        description="Business sector used to select a synthetic load shape.",
    )
    data_source: Literal["synthetic", "csv"] = Field(
        default="synthetic",
        description="Origin of the consumption data.",
    )

    # -- Optional high-resolution series -------------------------------------
    quarter_hourly_consumption_kwh: Optional[list[float]] = Field(
        default=None,
        description=(
            "Quarter-hourly electricity consumption in kWh "
            f"({QUARTER_HOURS_PER_YEAR} values). Optional; used for more "
            "accurate peak-shaving analysis when available."
        ),
    )

    # -- Validators ----------------------------------------------------------
    @field_validator("quarter_hourly_consumption_kwh")
    @classmethod
    def _validate_quarter_hourly_length(
        cls, v: Optional[list[float]],
    ) -> Optional[list[float]]:
        if v is not None and len(v) != QUARTER_HOURS_PER_YEAR:
            raise ValueError(
                f"quarter_hourly_consumption_kwh must have exactly "
                f"{QUARTER_HOURS_PER_YEAR} values, got {len(v)}."
            )
        return v

    @field_validator("hourly_consumption_kwh")
    @classmethod
    def _validate_non_negative(cls, v: list[float]) -> list[float]:
        if any(x < 0 for x in v):
            raise ValueError(
                "All hourly consumption values must be >= 0."
            )
        return v

    # -- Derived helpers -----------------------------------------------------
    @property
    def load_factor(self) -> float:
        """Ratio of average demand to peak demand (0-1)."""
        if self.peak_demand_kw == 0:
            return 0.0
        avg = self.annual_consumption_kwh / HOURS_PER_YEAR
        return avg / self.peak_demand_kw

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_SERIALIZE_NUMPY,
        )
