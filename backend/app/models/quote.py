from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class Quote(BaseModel):
    supplier: str
    product: str
    price: float
    currency: str
    country: str
    material: str
    tariff_rate: Optional[float] = None
    exchange_rate: Optional[float] = None


class LizFieldRecommendationRequest(BaseModel):
    product_name: str
    product_description: str = ""
    existing_fields: List[str] = Field(default_factory=list)


class UploadOptions(BaseModel):
    manual_fields: List[str] = Field(default_factory=list)
    use_liz_recommendations: bool = False
    product_name: str = ""
    product_description: str = ""


class QuoteRecord(BaseModel):
    id: int
    filename: str
    group_key: str
    extracted: Dict[str, Any]
    selected_fields: Dict[str, Any]


class ExportOptions(BaseModel):
    quote_ids: List[int] = Field(default_factory=list)
    export_layout: str = "same_sheet"
    group_by: str = "supplier"