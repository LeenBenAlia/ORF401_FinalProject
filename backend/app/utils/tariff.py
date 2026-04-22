def get_tariff_rate(country: str, product: str) -> float:
    # Mock tariff rates based on country
    # In real app, integrate with customs API
    tariffs = {
        "China": 0.05,  # 5%
        "India": 0.03,
        "USA": 0.0,
        "Germany": 0.02,
    }
    return tariffs.get(country, 0.01)  # Default 1%