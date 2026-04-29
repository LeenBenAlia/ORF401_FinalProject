from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Header
from typing import List, Dict, Any
import os
import uuid
import json
import re
from email import policy
from email.parser import BytesParser
import pandas as pd
from ..utils.pdf_processor import extract_quote_data
from ..models.quote import (
    Quote,
    LizFieldRecommendationRequest,
    GroupCreateRequest,
    AssignGroupRequest,
    QuoteIdsRequest,
    ProductCreateRequest,
    AssignProductRequest,
)
from .auth import get_company_from_auth_header
from .. import persistence

router = APIRouter()

RESERVED_TRASH_FOLDER = "__trash"

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
QUOTE_STORE: List[Dict[str, Any]] = []
NEXT_ID = 1
GROUP_STORE: Dict[str, List[str]] = {}
PRODUCT_CATALOG: Dict[str, List[str]] = {}


def _persist_quote_state() -> None:
    persistence.save_quotes_bundle(QUOTE_STORE, NEXT_ID, GROUP_STORE, PRODUCT_CATALOG)


def hydrate_quote_store() -> None:
    """Load quotes + folders from disk (call after auth/companies hydrate on API startup)."""
    global NEXT_ID
    ql, nid, gs, pc = persistence.load_quotes_bundle()
    QUOTE_STORE.clear()
    QUOTE_STORE.extend(ql)
    GROUP_STORE.clear()
    GROUP_STORE.update(gs)
    PRODUCT_CATALOG.clear()
    PRODUCT_CATALOG.update(pc)
    NEXT_ID = nid


def _ensure_company_catalog(company_id: str) -> List[str]:
    if company_id not in PRODUCT_CATALOG:
        PRODUCT_CATALOG[company_id] = []
    return PRODUCT_CATALOG[company_id]


def _add_product_name(company_id: str, name: str) -> None:
    lst = _ensure_company_catalog(company_id)
    if name not in lst:
        lst.append(name)
        lst.sort(key=lambda s: s.lower())


BASELINE_FIELDS = [
    "product_name",
    "supplier_company",
    "product_section_usage",
    "usage_frequency",
    "access_id",
    "subpart_or_compartment",
    "price",
    "cost_per_unit",
    "total_cost_per_business_unit",
    "dimensions",
    "thickness",
    "size",
    "weight",
    "country_of_origin",
    "geography",
    "raw_materials",
    "chemical_composition",
    "melting_point",
    "currency",
]


def generate_liz_recommendations(product_name: str, product_description: str) -> List[str]:
    text = f"{product_name} {product_description}".lower()
    recommendations = set(BASELINE_FIELDS)

    if any(keyword in text for keyword in ["battery", "electrical", "electronics"]):
        recommendations.update(["voltage", "current_rating", "thermal_tolerance", "certification"])
    if any(keyword in text for keyword in ["metal", "steel", "aluminum", "alloy"]):
        recommendations.update(["grade", "hardness", "yield_strength", "surface_finish"])
    if any(keyword in text for keyword in ["plastic", "polymer", "resin"]):
        recommendations.update(["resin_type", "flammability_rating", "density"])
    if any(keyword in text for keyword in ["aerospace", "automotive", "medical"]):
        recommendations.update(["compliance_standard", "traceability_level", "lot_number"])

    return sorted(recommendations)


def parse_manual_fields(raw_fields: str) -> List[str]:
    if not raw_fields:
        return []
    try:
        value = json.loads(raw_fields)
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
    except json.JSONDecodeError:
        pass
    return [field.strip() for field in raw_fields.split(",") if field.strip()]


def build_selected_fields(
    extracted: Dict[str, Any],
    manual_fields: List[str],
    use_liz: bool,
    product_name: str,
    product_description: str,
) -> Dict[str, Any]:
    selected_fields: Dict[str, Any] = {}
    target_fields = set(manual_fields)
    if use_liz:
        target_fields.update(generate_liz_recommendations(product_name, product_description))
    target_fields.update(["supplier", "product", "price", "currency", "country", "material"])

    normalized_lookup = {
        "supplier_company": "supplier",
        "product_name": "product",
        "country_of_origin": "country",
        "raw_materials": "material",
        "cost_per_unit": "price",
    }

    for field in sorted(target_fields):
        source_field = normalized_lookup.get(field, field)
        selected_fields[field] = extracted.get(source_field)
        if selected_fields[field] is None:
            selected_fields[field] = "Not found in quote"
    return selected_fields


def _extract_from_text(text: str) -> Dict[str, Any]:
    def _get(pattern: str, default: str = "Unknown") -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        return match.group(1).strip() if match else default

    raw_price = _get(r"Price:\s*[$]?([0-9]+(?:\.[0-9]+)?)", "0")
    try:
        price = float(raw_price)
    except ValueError:
        price = 0.0

    return {
        "supplier": _get(r"Supplier:\s*([^\n]+)"),
        "product": _get(r"Product:\s*([^\n]+)"),
        "price": price,
        "currency": _get(r"Currency:\s*([A-Z]{3})", "USD"),
        "country": _get(r"Country:\s*([^\n]+)"),
        "material": _get(r"Material:\s*([^\n]+)"),
        "tariff_rate": None,
        "exchange_rate": None,
    }


def _extract_from_spreadsheet(file_path: str) -> Dict[str, Any]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
    if df.empty:
        raise ValueError("Spreadsheet is empty")
    row = df.iloc[0].to_dict()
    lowered = {str(k).lower().strip(): v for k, v in row.items()}

    def _lookup(*keys, default="Unknown"):
        for key in keys:
            if key in lowered and str(lowered[key]).strip():
                return lowered[key]
        return default

    price_value = _lookup("price", "cost", "cost_per_unit", default=0.0)
    try:
        price = float(price_value)
    except Exception:
        price = 0.0

    return {
        "supplier": str(_lookup("supplier", "supplier_company")),
        "product": str(_lookup("product", "product_name", "part", default="Unknown")),
        "price": price,
        "currency": str(_lookup("currency", default="USD")),
        "country": str(_lookup("country", "country_of_origin")),
        "material": str(_lookup("material", "raw_materials")),
        "tariff_rate": None,
        "exchange_rate": None,
    }


def _extract_from_email(file_path: str) -> Dict[str, Any]:
    with open(file_path, "rb") as f:
        msg = BytesParser(policy=policy.default).parse(f)
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body += part.get_content()
    else:
        body = msg.get_content()
    if not body:
        body = msg.get("subject", "")
    return _extract_from_text(body)


def _extract_quote_data_by_type(file_path: str, original_filename: str) -> Dict[str, Any]:
    ext = os.path.splitext(original_filename)[1].lower()
    if ext == ".pdf":
        return extract_quote_data(file_path)
    if ext in {".xlsx", ".xls", ".csv"}:
        return _extract_from_spreadsheet(file_path)
    if ext in {".eml", ".txt"}:
        return _extract_from_email(file_path) if ext == ".eml" else _extract_from_text(open(file_path, "r", encoding="utf-8", errors="ignore").read())
    raise ValueError("Unsupported file type. Upload PDF, Excel (xlsx/xls/csv), or email export (eml/txt).")


@router.post("/liz/recommend-fields")
async def recommend_fields(payload: LizFieldRecommendationRequest):
    recommended_fields = generate_liz_recommendations(payload.product_name, payload.product_description)
    existing = {field.strip() for field in payload.existing_fields if field.strip()}
    missing_fields = [field for field in recommended_fields if field not in existing]
    return {
        "agent": "Liz",
        "recommended_fields": recommended_fields,
        "missing_fields": missing_fields,
    }

@router.post("/upload")
async def upload_quote(
    files: List[UploadFile] = File(...),
    manual_fields: str = Form(""),
    use_liz_recommendations: bool = Form(False),
    product_name: str = Form(""),
    product_description: str = Form(""),
    manual_product: str = Form(""),
    group_key: str = Form("default"),
    output_mode: str = Form("excel"),
    authorization: str = Header(None),
):
    global NEXT_ID
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    parsed_manual_fields = parse_manual_fields(manual_fields)
    results = []

    if not files:
        raise HTTPException(
            status_code=400,
            detail="At least one quote file is required (PDF, Excel, CSV, EML, or TXT).",
        )

    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")

        content = await file.read()
        max_upload_size = 25 * 1024 * 1024  # 25 MB
        if len(content) > max_upload_size:
            raise HTTPException(status_code=413, detail="File too large. Max size is 25MB.")

        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as f:
            f.write(content)

        try:
            extracted = _extract_quote_data_by_type(file_path, file.filename)
            quote = Quote(**extracted)
            _ = quote
            selected_fields = build_selected_fields(
                extracted,
                parsed_manual_fields,
                use_liz_recommendations,
                product_name,
                product_description,
            )
            record = {
                "id": NEXT_ID,
                "company_id": company_id,
                "filename": file.filename,
                "group_key": group_key,
                "trashed": False,
                "source_type": os.path.splitext(file.filename)[1].lower(),
                "extracted": extracted,
                "selected_fields": selected_fields,
            }
            mp_line = (manual_product or "").strip()
            if mp_line:
                record["manual_product"] = mp_line
                _add_product_name(company_id, mp_line)
            if company_id not in GROUP_STORE:
                GROUP_STORE[company_id] = ["default"]
            if group_key and group_key not in GROUP_STORE[company_id]:
                GROUP_STORE[company_id].append(group_key)
            QUOTE_STORE.append(record)
            results.append(record)
            NEXT_ID += 1
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to process '{file.filename}'. Please confirm it is a valid quote file. {exc}",
            ) from exc

    _persist_quote_state()

    return {
        "message": f"Processed {len(results)} quote file(s)",
        "data": results,
        "liz_enabled": use_liz_recommendations,
        "manual_fields": parsed_manual_fields,
        "output_mode": output_mode,
    }

@router.get("/quotes")
async def get_quotes(authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    quotes = [
        q
        for q in QUOTE_STORE
        if q.get("company_id") == company["id"] and not q.get("trashed")
    ]
    return {"quotes": quotes}


@router.get("/quotes/trash")
async def get_trashed_quotes(authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    quotes = [
        q
        for q in QUOTE_STORE
        if q.get("company_id") == company["id"] and q.get("trashed")
    ]
    return {"quotes": quotes}


@router.post("/quotes/trash")
async def move_quotes_to_trash(payload: QuoteIdsRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    updated = 0
    for q in QUOTE_STORE:
        if q["id"] not in payload.quote_ids or q.get("company_id") != company_id:
            continue
        if q.get("trashed"):
            continue
        q["previous_group_key"] = q.get("group_key") or "default"
        q["trashed"] = True
        q["group_key"] = RESERVED_TRASH_FOLDER
        updated += 1
    _persist_quote_state()
    return {"updated_count": updated}


@router.post("/quotes/restore")
async def restore_quotes_from_trash(payload: QuoteIdsRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    updated = 0
    company_id_not_in_group = company_id not in GROUP_STORE
    if company_id_not_in_group:
        GROUP_STORE[company_id] = ["default"]

    for q in QUOTE_STORE:
        if q["id"] not in payload.quote_ids or q.get("company_id") != company_id:
            continue
        if not q.get("trashed"):
            continue
        restore_key = q.pop("previous_group_key", None) or "default"
        q["trashed"] = False
        q["group_key"] = restore_key
        if restore_key not in GROUP_STORE[company_id]:
            GROUP_STORE[company_id].append(restore_key)
        updated += 1
    _persist_quote_state()
    return {"updated_count": updated}

@router.get("/quotes/{quote_id}")
async def get_quote(quote_id: int):
    # Return specific quote
    return {"quote": {}}

@router.post("/compare")
async def compare_quotes(quote_ids: List[int], authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    selected = [
        quote
        for quote in QUOTE_STORE
        if quote["id"] in quote_ids
        and quote.get("company_id") == company["id"]
        and not quote.get("trashed")
    ]
    return {"comparison": selected}


@router.get("/groups")
async def get_groups(authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    groups = GROUP_STORE.get(company["id"], ["default"])
    return {"groups": groups}


@router.post("/groups")
async def create_group(payload: GroupCreateRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    if company_id not in GROUP_STORE:
        GROUP_STORE[company_id] = ["default"]
    group_name = payload.name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Group name is required")
    if group_name == RESERVED_TRASH_FOLDER or group_name.startswith("__"):
        raise HTTPException(status_code=400, detail="That name is reserved for the system.")
    if group_name not in GROUP_STORE[company_id]:
        GROUP_STORE[company_id].append(group_name)
    _persist_quote_state()
    return {"groups": GROUP_STORE[company_id]}


@router.get("/products")
async def list_products(authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    return {"products": _ensure_company_catalog(company["id"])}


@router.post("/products")
async def create_product(payload: ProductCreateRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Product name is required")
    _add_product_name(company_id, name)
    _persist_quote_state()
    return {"products": _ensure_company_catalog(company_id)}


@router.post("/quotes/assign-product")
async def assign_quotes_to_product(payload: AssignProductRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    product_name = payload.product_name.strip()
    updated = 0
    for quote in QUOTE_STORE:
        if quote["id"] not in payload.quote_ids or quote.get("company_id") != company_id:
            continue
        if quote.get("trashed"):
            continue
        if product_name:
            quote["manual_product"] = product_name
            _add_product_name(company_id, product_name)
        else:
            quote.pop("manual_product", None)
        updated += 1
    _persist_quote_state()
    return {"updated_count": updated, "product": product_name or None}


@router.post("/quotes/assign-group")
async def assign_quotes_to_group(payload: AssignGroupRequest, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    company_id = company["id"]
    group_name = payload.group_name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Group name is required")
    if group_name == RESERVED_TRASH_FOLDER or group_name.startswith("__"):
        raise HTTPException(
            status_code=400,
            detail="Reserved folder name. Move items to Trash from the dashboard or Quotes page.",
        )
    if company_id not in GROUP_STORE:
        GROUP_STORE[company_id] = ["default"]
    if group_name not in GROUP_STORE[company_id]:
        GROUP_STORE[company_id].append(group_name)

    updated = 0
    for quote in QUOTE_STORE:
        if quote["id"] in payload.quote_ids and quote.get("company_id") == company_id:
            if quote.get("trashed"):
                continue
            quote["group_key"] = group_name
            updated += 1
    _persist_quote_state()
    return {"updated_count": updated, "group": group_name}