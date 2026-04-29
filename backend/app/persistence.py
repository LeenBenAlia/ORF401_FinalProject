"""
Lightweight JSON persistence so quote libraries and folders survive API restarts.
Sessions (Bearer tokens) are still ephemeral — users re-login after a restart.

Set BLAISE_DATA_DIR to override where companies.json / quotes_store.json live.
"""

from __future__ import annotations

import json
import os
from threading import Lock
from typing import Any, Dict, List, Tuple

_LOCK = Lock()

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
DATA_DIR = os.getenv("BLAISE_DATA_DIR") or os.path.join(_BACKEND_ROOT, "data")
COMPANIES_FILE = os.path.join(DATA_DIR, "companies.json")
QUOTES_FILE = os.path.join(DATA_DIR, "quotes_store.json")


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def load_company_store() -> Dict[str, Dict[str, str]]:
    if not os.path.isfile(COMPANIES_FILE):
        return {}
    try:
        with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
            if isinstance(raw, dict):
                # Expect { email: record }
                return raw
            return {}
    except (json.JSONDecodeError, OSError, TypeError):
        return {}


def save_company_store(company_store: Dict[str, Dict[str, str]]) -> None:
    with _LOCK:
        ensure_data_dir()
        tmp = COMPANIES_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(company_store, f, indent=2)
        os.replace(tmp, COMPANIES_FILE)


def load_quotes_bundle() -> Tuple[
    List[Dict[str, Any]], int, Dict[str, List[str]], Dict[str, List[str]]
]:
    """Returns (quotes, next_id, group_store, product_catalog_by_company_id). Missing file → empty defaults."""
    if not os.path.isfile(QUOTES_FILE):
        return [], 1, {}, {}
    try:
        with open(QUOTES_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        quotes = raw.get("quotes") or []
        next_id = int(raw.get("next_id") or 1)
        group_store_raw = raw.get("group_store") or {}
        # JSON keys survive as strings — company ids stay strings
        group_store: Dict[str, List[str]] = {}
        if isinstance(group_store_raw, dict):
            for k, v in group_store_raw.items():
                key = str(k)
                group_store[key] = list(v) if isinstance(v, list) else ["default"]

        product_catalog: Dict[str, List[str]] = {}
        pc_raw = raw.get("product_catalog") or {}
        if isinstance(pc_raw, dict):
            for k, v in pc_raw.items():
                key = str(k)
                product_catalog[key] = [str(x).strip() for x in v if isinstance(x, str) and x.strip()]

        max_id = 0
        for q in quotes:
            if isinstance(q, dict) and isinstance(q.get("id"), int):
                max_id = max(max_id, q["id"])
        next_id = max(next_id, max_id + 1 if quotes else next_id)

        return quotes if isinstance(quotes, list) else [], next_id, group_store, product_catalog
    except (json.JSONDecodeError, OSError, TypeError, ValueError):
        return [], 1, {}, {}


def save_quotes_bundle(
    quotes: List[Dict[str, Any]],
    next_id: int,
    group_store: Dict[str, List[str]],
    product_catalog: Dict[str, List[str]],
) -> None:
    with _LOCK:
        ensure_data_dir()
        payload = {
            "quotes": quotes,
            "next_id": int(next_id),
            "group_store": group_store,
            "product_catalog": product_catalog,
        }
        tmp = QUOTES_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        os.replace(tmp, QUOTES_FILE)
