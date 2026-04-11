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
    is_percentage: Optional[int] = 1


class IndicatorResponse(BaseModel):
    id: int
    name: str
    display_name: str
    formula: str
    description: Optional[str]
    category: Optional[str]
    is_percentage: int = 1

    class Config:
        from_attributes = True


class CalculateRequest(BaseModel):
    company_id: int
    indicator_ids: list[int]
    years: list[int]
    quarter: Optional[int] = None


@router.get("/", response_model=list[IndicatorResponse])
def get_indicators(db: Session = Depends(get_db)):
    return db.query(IndicatorDefinition).all()


@router.post("/", response_model=IndicatorResponse)
def create_indicator(indicator: IndicatorCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(IndicatorDefinition)
        .filter(IndicatorDefinition.name == indicator.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Indicator already exists")
    db_indicator = IndicatorDefinition(**indicator.model_dump())
    db.add(db_indicator)
    db.commit()
    db.refresh(db_indicator)
    return db_indicator


@router.delete("/{indicator_id}")
def delete_indicator(indicator_id: int, db: Session = Depends(get_db)):
    indicator = (
        db.query(IndicatorDefinition)
        .filter(IndicatorDefinition.id == indicator_id)
        .first()
    )
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    db.delete(indicator)
    db.commit()
    return {"message": "Indicator deleted"}


@router.post("/calculate")
def calculate(request: CalculateRequest, db: Session = Depends(get_db)):
    results = {}
    indicators = (
        db.query(IndicatorDefinition)
        .filter(IndicatorDefinition.id.in_(request.indicator_ids))
        .all()
    )
    for year in request.years:
        query = db.query(FinancialData).filter(
            FinancialData.company_id == request.company_id, FinancialData.year == year
        )
        if request.quarter is not None:
            query = query.filter(FinancialData.quarter == request.quarter)
        else:
            query = query.filter(FinancialData.quarter.is_(None))
        raw = query.all()
        variables = {row.variable_name: row.value for row in raw}
        results[year] = {}
        for indicator in indicators:
            results[year][indicator.display_name] = calculate_indicator(
                indicator.formula, variables
            )
    return results
