import os
import requests
from langchain_core.tools import tool
import datetime

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
        geo = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": location, "count": 1, "language": "en"},
            timeout=10,
        )
        geo.raise_for_status()
        places = geo.json().get("results", [])

        if not places:
            return {"error": f"Location not found: {location}"}

        place = places[0]

        weather = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "current": (
                    "temperature_2m,relative_humidity_2m,"
                    "apparent_temperature,is_day,precipitation,"
                    "weather_code,wind_speed_10m"
                ),
                "timezone": "auto",
            },
            timeout=10,
        )
        weather.raise_for_status()

        return {
            "location": ", ".join(
                filter(None, [place.get("name"), place.get("country")])
            ),
            "current": weather.json().get("current", {}),
            "units": weather.json().get("current_units", {}),
        }

    except requests.RequestException as exc:
        return {"error": f"Weather service unavailable: {exc}"}