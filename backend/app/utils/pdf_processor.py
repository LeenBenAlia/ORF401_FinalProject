import pdfplumber
import re
from typing import Dict, Any
from .exchange_rate import get_exchange_rate
from .tariff import get_tariff_rate

def extract_quote_data(pdf_path: str) -> Dict[str, Any]:
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
    
    # Basic parsing
    supplier = extract_supplier(text)
    product = extract_product(text)
    price = extract_price(text)
    currency = extract_currency(text)
    country = extract_country(text)
    material = extract_material(text)
    
    # Get additional data
    tariff_rate = get_tariff_rate(country, product)
    exchange_rate = get_exchange_rate(currency)
    
    data = {
        "supplier": supplier,
        "product": product,
        "price": price,
        "currency": currency,
        "country": country,
        "material": material,
        "tariff_rate": tariff_rate,
        "exchange_rate": exchange_rate,
    }
    return data

def extract_supplier(text: str) -> str:
    # Simple regex for supplier
    match = re.search(r"Supplier:\s*([^\n]+)", text, re.IGNORECASE)
    return match.group(1).strip() if match else "Unknown"

def extract_product(text: str) -> str:
    match = re.search(r"Product:\s*([^\n]+)", text, re.IGNORECASE)
    return match.group(1).strip() if match else "Unknown"

def extract_price(text: str) -> float:
    match = re.search(r"Price:\s*\$?(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    return float(match.group(1)) if match else 0.0

def extract_currency(text: str) -> str:
    match = re.search(r"Currency:\s*([A-Z]{3})", text, re.IGNORECASE)
    return match.group(1) if match else "USD"

def extract_country(text: str) -> str:
    match = re.search(r"Country:\s*([^\n]+)", text, re.IGNORECASE)
    return match.group(1).strip() if match else "Unknown"

def extract_material(text: str) -> str:
    match = re.search(r"Material:\s*([^\n]+)", text, re.IGNORECASE)
    return match.group(1).strip() if match else "Unknown"