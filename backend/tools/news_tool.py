import os
import requests


def fetch_latest_news(query: str, page_size: int = 20):
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
