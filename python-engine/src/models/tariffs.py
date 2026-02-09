"""Tariff and network-cost models for the Dutch electricity market."""

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

import orjson
from pydantic import BaseModel, Field, model_validator


class NetworkOperator(str, Enum):
    """Major Dutch distribution-system operators (DSOs)."""

    LIANDER = "liander"
    ENEXIS = "enexis"
    STEDIN = "stedin"


class TariffStructure(BaseModel):
    """
    All electricity price components needed for the financial simulation.

    Supports both fixed-rate and dynamic (hourly) pricing modes.
    """

    model_config = {"from_attributes": True, "populate_by_name": True}

    # -- Commodity & time-of-use rates ---------------------------------------
    commodity_rate_per_kwh: float = Field(
        ...,
        ge=0,
        description="Base commodity electricity rate in EUR/kWh.",
    )
    peak_rate: float = Field(
        ...,
        ge=0,
        description="Peak-hour electricity rate in EUR/kWh.",
    )
    off_peak_rate: float = Field(
        ...,
        ge=0,
        description="Off-peak electricity rate in EUR/kWh.",
    )

    # -- Network charges -----------------------------------------------------
    network_tariff_per_kw: float = Field(
        ...,
        ge=0,
        description=(
            "Capacity-based network tariff in EUR/kW/year "
            "(transporttarief)."
        ),
    )

    # -- Taxes & surcharges --------------------------------------------------
    energy_tax_per_kwh: float = Field(
        ...,
        ge=0,
        description="Energy tax (energiebelasting) in EUR/kWh.",
    )
    ode_surcharge_per_kwh: float = Field(
        ...,
        ge=0,
        description=(
            "ODE surcharge (opslag duurzame energie) in EUR/kWh."
        ),
    )

    # -- Feed-in --------------------------------------------------------------
    feed_in_tariff_per_kwh: float = Field(
        default=0.0,
        ge=0,
        description="Tariff received for electricity fed back into the grid in EUR/kWh.",
    )

    # -- Pricing mode --------------------------------------------------------
    pricing_mode: Literal["fixed", "dynamic"] = Field(
        default="fixed",
        description=(
            "Pricing mode. 'fixed' uses the peak/off-peak rates; "
            "'dynamic' uses the hourly_prices series."
        ),
    )
    hourly_prices: Optional[list[float]] = Field(
        default=None,
        description=(
            "Representative 24-hour price profile in EUR/kWh (index 0 = "
            "midnight). Required when pricing_mode is 'dynamic'."
        ),
    )

    # -- Network operator ----------------------------------------------------
    network_operator: NetworkOperator = Field(
        default=NetworkOperator.LIANDER,
        description="Distribution-system operator (netbeheerder).",
    )

    # -- Validators ----------------------------------------------------------
    @model_validator(mode="after")
    def _dynamic_requires_hourly_prices(self) -> TariffStructure:
        if self.pricing_mode == "dynamic" and self.hourly_prices is None:
            raise ValueError(
                "hourly_prices must be provided when pricing_mode is 'dynamic'."
            )
        if self.hourly_prices is not None and len(self.hourly_prices) != 24:
            raise ValueError(
                f"hourly_prices must contain exactly 24 values, "
                f"got {len(self.hourly_prices)}."
            )
        return self

    # -- Helpers -------------------------------------------------------------
    @property
    def all_in_fixed_rate(self) -> float:
        """Total fixed all-in rate (commodity + tax + ODE) in EUR/kWh."""
        return (
            self.commodity_rate_per_kwh
            + self.energy_tax_per_kwh
            + self.ode_surcharge_per_kwh
        )

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        """Serialize to JSON bytes using *orjson* for speed."""
        return orjson.dumps(
            self.model_dump(**kwargs),
            option=orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_INDENT_2,
        )
