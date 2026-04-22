import requests

def get_exchange_rate(from_currency: str, to_currency: str = "USD") -> float:
    # Using exchangerate-api.com (free tier)
    url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data["rates"].get(to_currency, 1.0)
    return 1.0  # Default to 1 if API fails