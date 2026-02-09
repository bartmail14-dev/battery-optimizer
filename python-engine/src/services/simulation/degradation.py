"""
Battery degradation models.

Three strategies for modelling capacity fade over the lifetime of a
battery energy storage system (BESS):

1. **Flat annual** -- simple linear degradation at a fixed annual rate.
2. **Cycle + calendar** -- combined cycle-count and calendar-age model.
3. **Arrhenius** -- temperature-dependent degradation following the
   Arrhenius equation (suited for LFP / NMC chemistries).

All public functions return the *remaining capacity fraction* (1.0 = no
degradation, 0.80 = 20% capacity lost).
"""

from __future__ import annotations

import numpy as np

# Re-export the canonical enum so callers can ``from ...degradation import
# DegradationModel`` without an extra import from the models package.
from src.models.battery import DegradationModel

__all__ = [
    "DegradationModel",
    "calculate_degradation",
]

# ---------------------------------------------------------------------------
# Physical constants
# ---------------------------------------------------------------------------
_BOLTZMANN_EV_PER_K: float = 8.617333262e-5  # Boltzmann constant in eV/K
_KELVIN_OFFSET: float = 273.15


# ---------------------------------------------------------------------------
# Public dispatcher
# ---------------------------------------------------------------------------

def calculate_degradation(
    model: DegradationModel,
    year: int,
    annual_cycles: float,
    cycle_life: int = 6000,
    annual_degradation_rate: float = 0.025,
    depth_of_discharge: float = 0.9,
    temperature_celsius: float = 25.0,
) -> float:
    """
    Calculate remaining capacity fraction at a given *year*.

    Parameters
    ----------
    model:
        Which degradation strategy to use.
    year:
        Year index (0 = fresh battery, 1 = after first year, ...).
    annual_cycles:
        Expected number of full-equivalent cycles per year.
    cycle_life:
        Total cycle-life rating of the cell (manufacturer spec).
    annual_degradation_rate:
        Linear annual degradation fraction (used by ``FLAT_ANNUAL`` model).
    depth_of_discharge:
        Typical depth of discharge per cycle (0-1). Deeper discharge
        increases the stress on the cell in the ``CYCLE_CALENDAR`` model.
    temperature_celsius:
        Ambient / cell temperature in degrees Celsius (used by the
        ``ARRHENIUS`` model).

    Returns
    -------
    float
        Remaining capacity fraction in the range (0, 1].
        1.0 means no degradation; 0.80 means 20% capacity lost.
    """
    if year < 0:
        raise ValueError(f"year must be >= 0, got {year}")

    if year == 0:
        return 1.0

    if model == DegradationModel.FLAT_ANNUAL:
        return _flat_annual(year, annual_degradation_rate)

    if model == DegradationModel.CYCLE_CALENDAR:
        # Deeper discharge increases cycle stress roughly linearly
        dod_stress = _dod_stress_factor(depth_of_discharge)
        return _cycle_calendar(
            year=year,
            annual_cycles=annual_cycles,
            cycle_life=cycle_life,
            calendar_degradation=0.005,
            dod_stress_factor=dod_stress,
        )

    if model == DegradationModel.ARRHENIUS:
        return _arrhenius(
            year=year,
            annual_cycles=annual_cycles,
            cycle_life=cycle_life,
            temperature_celsius=temperature_celsius,
            reference_temperature=25.0,
            activation_energy_ev=0.3,
        )

    raise ValueError(f"Unknown degradation model: {model}")


# ---------------------------------------------------------------------------
# Model 1 -- Flat annual
# ---------------------------------------------------------------------------

def _flat_annual(year: int, rate: float) -> float:
    """Simple linear degradation: capacity = 1 - rate * year.

    The result is clamped to [0, 1].
    """
    remaining = 1.0 - rate * year
    return float(np.clip(remaining, 0.0, 1.0))


# ---------------------------------------------------------------------------
# Model 2 -- Cycle + Calendar
# ---------------------------------------------------------------------------

def _cycle_calendar(
    year: int,
    annual_cycles: float,
    cycle_life: int,
    calendar_degradation: float = 0.005,
    dod_stress_factor: float = 1.0,
) -> float:
    """
    Combined cycle and calendar degradation.

    **Cycle degradation** is proportional to the cumulative number of
    equivalent full cycles divided by the rated cycle life.  A
    depth-of-discharge stress factor amplifies the cycle-ageing component
    (deeper discharge wears the cell faster).

    **Calendar degradation** is a baseline fade of ~0.5%/year that occurs
    regardless of usage (side-reaction driven, e.g. SEI growth).

    Formula::

        cycle_fraction = (annual_cycles * year * dod_stress) / cycle_life
        capacity = 1 - (cycle_fraction * cycle_weight + calendar * year)

    The ``cycle_weight`` is set to 0.8, meaning cycle ageing contributes
    ~80% of the total fade budget.  Calendar ageing contributes the
    remainder.
    """
    cycle_weight = 0.8

    cumulative_cycles = annual_cycles * year
    cycle_fraction = (cumulative_cycles * dod_stress_factor) / cycle_life

    total_degradation = (cycle_fraction * cycle_weight) + (calendar_degradation * year)

    remaining = 1.0 - total_degradation
    return float(np.clip(remaining, 0.0, 1.0))


def _dod_stress_factor(depth_of_discharge: float) -> float:
    """
    Map depth-of-discharge to a stress multiplier.

    A DoD of 0.5 yields a stress factor near 1.0 (the reference point for
    most cycle-life specs).  Higher DoD increases stress, lower DoD
    decreases it.  The relationship is roughly quadratic based on empirical
    Li-ion ageing data:

        stress = 0.2 + 1.6 * DoD^2

    Examples:
        DoD 0.5 -> ~0.6  (gentle)
        DoD 0.8 -> ~1.22
        DoD 0.9 -> ~1.49
        DoD 1.0 -> 1.80
    """
    return 0.2 + 1.6 * depth_of_discharge ** 2


# ---------------------------------------------------------------------------
# Model 3 -- Arrhenius
# ---------------------------------------------------------------------------

def _arrhenius(
    year: int,
    annual_cycles: float,
    cycle_life: int,
    temperature_celsius: float,
    reference_temperature: float = 25.0,
    activation_energy_ev: float = 0.3,
) -> float:
    """
    Arrhenius-based degradation model.

    Temperature accelerates degradation exponentially via the Arrhenius
    equation.  The rate factor scales the base (cycle-count) degradation
    computed at the reference temperature:

        T_ref = reference_temperature + 273.15   (Kelvin)
        T     = temperature_celsius   + 273.15   (Kelvin)

        rate_factor = exp( Ea / kB * (1/T_ref - 1/T) )

    where:

    - ``Ea`` is the activation energy (~0.3 eV for LFP, 0.3-0.6 eV for
      NMC).
    - ``kB`` is the Boltzmann constant (8.617e-5 eV/K).

    Rule of thumb: every 10 degC above the reference roughly doubles the
    degradation rate.

    The base degradation at T_ref is the simple cycle-fraction model.
    """
    # Temperatures in Kelvin
    t_ref_k = reference_temperature + _KELVIN_OFFSET
    t_k = temperature_celsius + _KELVIN_OFFSET

    # Prevent division by zero for extreme inputs
    if t_k <= 0 or t_ref_k <= 0:
        raise ValueError(
            "Temperature in Kelvin must be positive. Got "
            f"T={t_k:.1f} K, T_ref={t_ref_k:.1f} K."
        )

    # Arrhenius acceleration factor
    exponent = (activation_energy_ev / _BOLTZMANN_EV_PER_K) * (
        1.0 / t_ref_k - 1.0 / t_k
    )
    rate_factor = float(np.exp(exponent))

    # Base degradation: simple linear cycle-fraction at reference temperature
    cumulative_cycles = annual_cycles * year
    base_degradation = cumulative_cycles / cycle_life

    # Apply temperature acceleration
    total_degradation = base_degradation * rate_factor

    # Add a small calendar component (temperature-independent baseline)
    calendar_component = 0.005 * year

    remaining = 1.0 - total_degradation - calendar_component
    return float(np.clip(remaining, 0.0, 1.0))
