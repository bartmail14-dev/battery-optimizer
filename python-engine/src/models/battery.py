"""Battery configuration and degradation models."""

from __future__ import annotations

from enum import Enum
from typing import Optional

import orjson
from pydantic import BaseModel, Field, model_validator


def _orjson_dumps(v: object, *, default: object = None) -> str:
    return orjson.dumps(v, default=default).decode()


class DegradationModel(str, Enum):
    """Strategy used to model battery capacity fade over time."""

    FLAT_ANNUAL = "flat_annual"
    """Simple linear annual degradation (e.g. 2 % per year)."""

    CYCLE_CALENDAR = "cycle_calendar"
    """Combined cycle-count and calendar-age degradation."""

    ARRHENIUS = "arrhenius"
    """Temperature-dependent Arrhenius degradation model."""


class DegradationConfig(BaseModel):
    """Parameters that control the degradation simulation."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    model_type: DegradationModel = Field(
        default=DegradationModel.FLAT_ANNUAL,
        description="Degradation model strategy to use.",
    )
    temperature_celsius: Optional[float] = Field(
        default=None,
        description=(
            "Ambient temperature in Celsius. Required when model_type is "
            "ARRHENIUS; ignored otherwise."
        ),
    )

    @model_validator(mode="after")
    def _arrhenius_requires_temperature(self) -> DegradationConfig:
        if (
            self.model_type == DegradationModel.ARRHENIUS
            and self.temperature_celsius is None
        ):
            raise ValueError(
                "temperature_celsius is required when using the Arrhenius "
                "degradation model."
            )
        return self


class BatteryConfig(BaseModel):
    """Full specification of a battery energy storage system (BESS)."""

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {float: lambda v: round(v, 6)},
    }

    capacity_kwh: float = Field(
        ...,
        gt=0,
        description="Total usable energy capacity of the battery in kWh.",
    )
    power_kw: float = Field(
        ...,
        gt=0,
        description="Maximum charge / discharge power in kW.",
    )
    round_trip_efficiency: float = Field(
        ...,
        ge=0.85,
        le=0.92,
        description=(
            "Round-trip efficiency (0-1). Typical Li-ion NMC values are "
            "0.85 -- 0.92."
        ),
    )
    annual_degradation: float = Field(
        ...,
        ge=0.02,
        le=0.03,
        description=(
            "Annual capacity degradation fraction (0-1). Typical range is "
            "0.02 -- 0.03 (2 -- 3 %)."
        ),
    )
    cycle_life: int = Field(
        default=6000,
        gt=0,
        description=(
            "Expected number of full-equivalent charge/discharge cycles "
            "before end-of-life."
        ),
    )
    depth_of_discharge: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Maximum allowed depth of discharge (0-1). A value of 0.9 means "
            "only 90 % of the nominal capacity is used."
        ),
    )
    cost_per_kwh: float = Field(
        ...,
        ge=0,
        description="Battery module cost in EUR per kWh of installed capacity.",
    )
    installation_cost: float = Field(
        ...,
        ge=0,
        description="One-time installation / integration cost in EUR.",
    )
    annual_maintenance_cost: float = Field(
        ...,
        ge=0,
        description="Yearly maintenance cost in EUR.",
    )
    lifespan_years: int = Field(
        ...,
        gt=0,
        description="Expected economic lifespan in years.",
    )

    # -- Optional degradation configuration ----------------------------------
    degradation_config: DegradationConfig = Field(
        default_factory=DegradationConfig,
        description="Degradation simulation settings.",
    )

    # -- Derived helpers ------------------------------------------------------
    @property
    def usable_capacity_kwh(self) -> float:
        """Effective capacity after applying depth-of-discharge limit."""
        return self.capacity_kwh * self.depth_of_discharge

    @property
    def total_capex(self) -> float:
        """Total upfront capital expenditure in EUR."""
        return (self.capacity_kwh * self.cost_per_kwh) + self.installation_cost

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_INDENT_2,
        )
