from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List, Dict, Any
import os
import uuid
import json
from ..utils.pdf_processor import extract_quote_data
from ..models.quote import Quote, LizFieldRecommendationRequest

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
QUOTE_STORE: List[Dict[str, Any]] = []
NEXT_ID = 1

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
    group_key: str = Form("default"),
    output_mode: str = Form("excel"),
):
    global NEXT_ID
    parsed_manual_fields = parse_manual_fields(manual_fields)
    results = []

    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required")

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        content = await file.read()
        max_upload_size = 25 * 1024 * 1024  # 25 MB
        if len(content) > max_upload_size:
            raise HTTPException(status_code=413, detail="File too large. Max size is 25MB.")

        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as f:
            f.write(content)

        try:
            extracted = extract_quote_data(file_path)
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
                "filename": file.filename,
                "group_key": group_key,
                "extracted": extracted,
                "selected_fields": selected_fields,
            }
            QUOTE_STORE.append(record)
            results.append(record)
            NEXT_ID += 1
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to process PDF '{file.filename}'. Please confirm it is valid. {exc}",
            ) from exc

    return {
        "message": f"Processed {len(results)} quote file(s)",
        "data": results,
        "liz_enabled": use_liz_recommendations,
        "manual_fields": parsed_manual_fields,
        "output_mode": output_mode,
    }

@router.get("/quotes")
async def get_quotes():
    return {"quotes": QUOTE_STORE}

@router.get("/quotes/{quote_id}")
async def get_quote(quote_id: int):
    # Return specific quote
    return {"quote": {}}

@router.post("/compare")
async def compare_quotes(quote_ids: List[int]):
    selected = [quote for quote in QUOTE_STORE if quote["id"] in quote_ids]
    return {"comparison": selected}