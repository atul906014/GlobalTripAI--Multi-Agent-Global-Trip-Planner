import os
import requests
from langchain_core.tools import tool
import datetime
from functools import lru_cache
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
session = requests.Session()

retry = Retry(
    total=2,
    backoff_factor=1,
    status_forcelist=[500, 502, 503, 504],
    allowed_methods=["GET"],
)

session.mount("https://", HTTPAdapter(max_retries=retry))

# Cache successful geocoding results for 24 hours.
@lru_cache(maxsize=256)
def geocode_location(location: str):
    response = session.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={
            "name": location,
            "count": 1,
            "language": "en",
        },
        timeout=10,
    )
    response.raise_for_status()

    places = response.json().get("results", [])
    return places[0] if places else None


# Cache weather results for 10 minutes.
_weather_cache = {}
WEATHER_TTL = 600



@tool
def fetch_latest_news(query: str, page_size: int = 20):
    """Fetch recent English news articles matching a search query."""
    api_key = os.getenv("NEWS_API_KEY")

    if not api_key:
        raise ValueError("NEWS_API_KEY is not set.")

    url = "https://newsapi.org/v2/everything"

    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": page_size,
        "apiKey": api_key,
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        print("Status:", response.status_code)
        print("Request:", response.url)

        response.raise_for_status()

        data = response.json()

        print("API status:", data.get("status"))
        print("Total results:", data.get("totalResults"))
        print("Error:", data.get("code"), data.get("message"))

        if data.get("status") != "ok":
            raise RuntimeError(
                data.get("message", "NewsAPI request failed")
            )

        articles = data.get("articles", [])

        print("Fetched:", len(articles))

        return articles

    except requests.exceptions.RequestException as exc:
        raise RuntimeError(
            f"Failed to fetch news from NewsAPI: {exc}"
        ) from exc


@tool
def get_current_date(timezone: str = "UTC"):
    """Fetch the current date and time in given timezone. Default is UTC."""
    return datetime.datetime.now(datetime.timezone.utc).astimezone(datetime.timezone.utc).isoformat()

@tool
def get_current_weather(location: str) -> dict:
    """Get current weather for a city using Open-Meteo."""

    try:
        place = geocode_location(location.strip().lower())

        if not place:
            return {"error": f"Location not found: {location}"}

        latitude = place["latitude"]
        longitude = place["longitude"]
        cache_key = (latitude, longitude)
        now = time.time()

        cached = _weather_cache.get(cache_key)

        if cached and now - cached["time"] < WEATHER_TTL:
            return cached["data"]

        response = session.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": (
                    "temperature_2m,relative_humidity_2m,"
                    "apparent_temperature,is_day,precipitation,"
                    "weather_code,wind_speed_10m"
                ),
                "timezone": "auto",
            },
            timeout=10,
        )

        if response.status_code == 429:
            return {
                "error": "Open-Meteo rate limit reached.",
                "retry_after": response.headers.get("Retry-After"),
                "message": (
                    "Please wait before retrying. "
                    "Do not repeatedly call the weather tool."
                ),
            }

        response.raise_for_status()
        data = response.json()

        result = {
            "location": ", ".join(
                filter(None, [
                    place.get("name"),
                    place.get("country"),
                ])
            ),
            "current": data.get("current", {}),
            "units": data.get("current_units", {}),
        }

        _weather_cache[cache_key] = {
            "time": time.time(),
            "data": result,
        }

        return result

    except requests.RequestException as exc:
        status = (
            exc.response.status_code
            if exc.response is not None
            else None
        )

        return {
            "error": "Weather service unavailable",
            "http_status": status,
            "details": str(exc),
        }
