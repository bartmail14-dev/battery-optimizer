"""Models for external market-data API responses (EPEX, TenneT, DSOs)."""

from __future__ import annotations

import datetime as _dt

import orjson
from pydantic import BaseModel, Field

from .tariffs import NetworkOperator


class EPEXPrice(BaseModel):
    """Single hourly price point from the EPEX day-ahead market."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    timestamp: _dt.datetime = Field(
        ...,
        description="Start of the delivery hour (UTC).",
    )
    price: float = Field(
        ...,
        description="Day-ahead price in EUR/MWh.",
    )

    @property
    def price_per_kwh(self) -> float:
        """Price converted to EUR/kWh."""
        return self.price / 1000.0


class EPEXDayAhead(BaseModel):
    """Full day-ahead price curve for a single delivery day."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    date: _dt.date = Field(
        ...,
        description="Delivery date.",
    )
    prices: list[EPEXPrice] = Field(
        ...,
        min_length=24,
        max_length=25,
        description=(
            "Hourly prices for the delivery day (24 or 25 for DST "
            "transition days)."
        ),
    )
    mean_price: float = Field(
        ...,
        description="Arithmetic mean of hourly prices in EUR/MWh.",
    )
    min_price: float = Field(
        ...,
        description="Minimum hourly price in EUR/MWh.",
    )
    max_price: float = Field(
        ...,
        description="Maximum hourly price in EUR/MWh.",
    )

    @property
    def spread(self) -> float:
        """Intra-day price spread in EUR/MWh."""
        return self.max_price - self.min_price

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        return orjson.dumps(
            self.model_dump(mode="json", **kwargs),
            option=orjson.OPT_INDENT_2,
        )


class ImbalancePrice(BaseModel):
    """Single settlement-period imbalance price from TenneT."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    timestamp: _dt.datetime = Field(
        ...,
        description="Start of the imbalance settlement period (UTC).",
    )
    up_price: float = Field(
        ...,
        description="Upward regulation price in EUR/MWh.",
    )
    down_price: float = Field(
        ...,
        description="Downward regulation price in EUR/MWh.",
    )
    mid_price: float = Field(
        ...,
        description=(
            "Mid-price ((up + down) / 2) in EUR/MWh, used as a "
            "reference value."
        ),
    )


class TennetBalancing(BaseModel):
    """Full-day imbalance price series from TenneT."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    date: _dt.date = Field(
        ...,
        description="Delivery date.",
    )
    prices: list[ImbalancePrice] = Field(
        ...,
        description="Settlement-period imbalance prices for the day.",
    )

    def model_dump_json_orjson(self, **kwargs: object) -> bytes:
        return orjson.dumps(
            self.model_dump(mode="json", **kwargs),
            option=orjson.OPT_INDENT_2,
        )


class GridTariff(BaseModel):
    """Regulated network tariff for a given DSO."""

    model_config = {"from_attributes": True, "populate_by_name": True}

    operator: NetworkOperator = Field(
        ...,
        description="Distribution-system operator.",
    )
    transport_capacity_per_kw_year: float = Field(
        ...,
        ge=0,
        description=(
            "Annual transport-capacity tariff in EUR per kW of contracted "
            "connection capacity."
        ),
    )
    measurement_service_per_year: float = Field(
        ...,
        ge=0,
        description="Annual measurement-service fee in EUR.",
    )
