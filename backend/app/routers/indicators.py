from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import IndicatorDefinition, FinancialData
from app.services.calculator import calculate_indicator
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class IndicatorCreate(BaseModel):
    name: str
    display_name: str
    formula: str
    description: Optional[str] = None
    category: Optional[str] = None

class IndicatorResponse(BaseModel):
    id: int
    name: str
    display_name: str
    formula: str
    description: Optional[str]
    category: Optional[str]
    class Config:
        from_attributes = True

class CalculateRequest(BaseModel):
    company_id: int
    indicator_ids: list[int]
    years: list[int]

@router.get("/", response_model=list[IndicatorResponse])
def get_indicators(db: Session = Depends(get_db)):
    return db.query(IndicatorDefinition).all()

@router.post("/", response_model=IndicatorResponse)
def create_indicator(indicator: IndicatorCreate, db: Session = Depends(get_db)):
    existing = db.query(IndicatorDefinition).filter(IndicatorDefinition.name == indicator.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Indicator already exists")
    db_indicator = IndicatorDefinition(**indicator.model_dump())
    db.add(db_indicator)
    db.commit()
    db.refresh(db_indicator)
    return db_indicator

@router.post("/calculate")
def calculate(request: CalculateRequest, db: Session = Depends(get_db)):
    results = {}
    indicators = db.query(IndicatorDefinition).filter(IndicatorDefinition.id.in_(request.indicator_ids)).all()
    for year in request.years:
        raw = db.query(FinancialData).filter(
            FinancialData.company_id == request.company_id,
            FinancialData.year == year
        ).all()
        variables = {row.variable_name: row.value for row in raw}
        results[year] = {}
        for indicator in indicators:
            results[year][indicator.display_name] = calculate_indicator(indicator.formula, variables)
    return results