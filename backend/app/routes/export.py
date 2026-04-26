from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import os
from ..models.quote import ExportOptions
from .quotes import QUOTE_STORE
from .auth import get_company_from_auth_header
from fastapi import Header

router = APIRouter()

@router.post("/export/excel")
async def export_to_excel(options: ExportOptions, authorization: str = Header(None)):
    company = get_company_from_auth_header(authorization)
    selected_quotes = [q for q in QUOTE_STORE if q.get("company_id") == company["id"]]
    if options.quote_ids:
        selected_quotes = [quote for quote in selected_quotes if quote["id"] in options.quote_ids]

    if not selected_quotes:
        raise HTTPException(status_code=400, detail="No quote data available to export")

    rows = []
    for quote in selected_quotes:
        row = {
            "quote_id": quote["id"],
            "filename": quote["filename"],
            "group_key": quote["group_key"],
        }
        row.update(quote["selected_fields"])
        rows.append(row)

    df = pd.DataFrame(rows)
    file_path = "exports/quotes.xlsx"
    os.makedirs("exports", exist_ok=True)

    if options.export_layout == "separate_sheets":
        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            for quote in rows:
                quote_df = pd.DataFrame([quote])
                sheet_name = f"Quote_{quote['quote_id']}"[:31]
                quote_df.to_excel(writer, sheet_name=sheet_name, index=False)
    elif options.export_layout == "grouped_sheets":
        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            for group_value, group_df in df.groupby(options.group_by, dropna=False):
                safe_group = str(group_value) if str(group_value).strip() else "Unknown"
                sheet_name = safe_group[:31]
                group_df.to_excel(writer, sheet_name=sheet_name, index=False)
    else:
        df.to_excel(file_path, index=False)

    return FileResponse(file_path, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename="quotes.xlsx")

@router.get("/export/autocad/{quote_id}")
async def export_to_autocad(quote_id: int):
    # Placeholder for AutoCAD export
    # Assume if it's a blueprint, convert to DWG
    # For now, return a message
    raise HTTPException(status_code=501, detail="AutoCAD export not implemented yet")