from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # ENTSO-E Transparency Platform
    entsoe_api_key: str = ""
    entsoe_base_url: str = "https://web-api.tp.entsoe.eu/api"

    # Cache settings
    cache_dir: str = ".cache"
    cache_ttl_hours: int = 24

    # Monte Carlo defaults
    monte_carlo_iterations: int = 2000
    monte_carlo_seed: int | None = None

    model_config = {"env_prefix": "BATTERY_"}


settings = Settings()
