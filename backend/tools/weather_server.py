import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather-mcp-server")


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def resolve_city(city: str) -> dict:
    """Resolve a city name into coordinates and timezone."""
    city = city.strip()

    if not city or len(city) > 100:
        raise ValueError("Provide a valid city name.")

    with httpx.Client(timeout=15.0) as client:
        response = client.get(
            GEOCODING_URL,
            params={
                "name": city,
                "count": 1,
                "language": "en",
                "format": "json",
            },
        )
        response.raise_for_status()
        results = response.json().get("results", [])

    if not results:
        raise ValueError(f"City not found: {city}")

    place = results[0]
    return {
        "name": place["name"],
        "country": place.get("country", "Unknown"),
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "timezone": place.get("timezone", "auto"),
    }


def fetch_weather(params: dict) -> dict:
    """Fetch weather data from Open-Meteo."""
    with httpx.Client(timeout=20.0) as client:
        response = client.get(FORECAST_URL, params=params)
        response.raise_for_status()
        return response.json()


@mcp.tool()
def get_current_weather(city: str) -> dict:
    """Get current temperature, humidity, wind and conditions for a city."""
    place = resolve_city(city)

    data = fetch_weather({
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "timezone": place["timezone"],
        "current": (
            "temperature_2m,relative_humidity_2m,"
            "apparent_temperature,is_day,precipitation,"
            "weather_code,wind_speed_10m"
        ),
    })

    current = data["current"]
    code = current.get("weather_code")

    return {
        "location": place["name"],
        "country": place["country"],
        "timezone": place["timezone"],
        "observed_at": current.get("time"),
        "temperature_c": current.get("temperature_2m"),
        "feels_like_c": current.get("apparent_temperature"),
        "humidity_percent": current.get("relative_humidity_2m"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "precipitation_mm": current.get("precipitation"),
        "conditions": WEATHER_CODES.get(code, f"Weather code {code}"),
        "source": "Open-Meteo",
    }


@mcp.tool()
def get_weather_forecast(city: str, days: int = 3) -> dict:
    """Get a daily weather forecast for a city for 1 to 7 days."""
    if not 1 <= days <= 7:
        raise ValueError("days must be between 1 and 7.")

    place = resolve_city(city)

    data = fetch_weather({
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "timezone": place["timezone"],
        "forecast_days": days,
        "daily": (
            "weather_code,temperature_2m_max,"
            "temperature_2m_min,precipitation_probability_max,"
            "wind_speed_10m_max"
        ),
    })

    daily = data["daily"]
    forecast = []

    for i, date in enumerate(daily["time"]):
        code = daily["weather_code"][i]
        forecast.append({
            "date": date,
            "conditions": WEATHER_CODES.get(
                code, f"Weather code {code}"
            ),
            "max_temperature_c": daily["temperature_2m_max"][i],
            "min_temperature_c": daily["temperature_2m_min"][i],
            "precipitation_probability_percent":
                daily["precipitation_probability_max"][i],
            "max_wind_speed_kmh": daily["wind_speed_10m_max"][i],
        })

    return {
        "location": place["name"],
        "country": place["country"],
        "timezone": place["timezone"],
        "forecast": forecast,
        "source": "Open-Meteo",
    }


@mcp.tool()
def get_weather_by_coordinates(
    latitude: float,
    longitude: float,
) -> dict:
    """Get current weather using latitude and longitude."""
    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90.")

    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180.")

    data = fetch_weather({
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,relative_humidity_2m,"
            "apparent_temperature,weather_code,wind_speed_10m"
        ),
        "timezone": "auto",
    })

    current = data["current"]
    code = current.get("weather_code")

    return {
        "latitude": latitude,
        "longitude": longitude,
        "observed_at": current.get("time"),
        "temperature_c": current.get("temperature_2m"),
        "feels_like_c": current.get("apparent_temperature"),
        "humidity_percent": current.get("relative_humidity_2m"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "conditions": WEATHER_CODES.get(code, f"Weather code {code}"),
        "source": "Open-Meteo",
    }


if __name__ == "__main__":
    # stdio is the default transport.
    # Never print application logs to stdout in stdio mode.
    mcp.run(transport="stdio")
