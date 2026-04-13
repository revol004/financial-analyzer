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
    agg_type: Optional[str] = None
    agg_years: Optional[int] = None
    base_indicator_id: Optional[int] = None


class IndicatorResponse(BaseModel):
    id: int
    name: str
    display_name: str
    formula: str
    description: Optional[str]
    category: Optional[str]
    is_percentage: int = 1
    agg_type: Optional[str] = None
    agg_years: Optional[int] = None
    base_indicator_id: Optional[int] = None

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
    existing = db.query(IndicatorDefinition).filter(IndicatorDefinition.name == indicator.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Indicator already exists")
    db_indicator = IndicatorDefinition(**indicator.model_dump())
    db.add(db_indicator)
    db.commit()
    db.refresh(db_indicator)
    return db_indicator


@router.delete("/{indicator_id}")
def delete_indicator(indicator_id: int, db: Session = Depends(get_db)):
    indicator = db.query(IndicatorDefinition).filter(IndicatorDefinition.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    db.delete(indicator)
    db.commit()
    return {"message": "Indicator deleted"}


@router.put("/{indicator_id}", response_model=IndicatorResponse)
def update_indicator(indicator_id: int, indicator: IndicatorCreate, db: Session = Depends(get_db)):
    db_indicator = db.query(IndicatorDefinition).filter(IndicatorDefinition.id == indicator_id).first()
    if not db_indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    for key, value in indicator.model_dump().items():
        setattr(db_indicator, key, value)
    db.commit()
    db.refresh(db_indicator)
    return db_indicator


@router.post("/calculate")
def calculate(request: CalculateRequest, db: Session = Depends(get_db)):
    results = {}
    indicators = db.query(IndicatorDefinition).filter(
        IndicatorDefinition.id.in_(request.indicator_ids)
    ).all()

    base_ids = [i.base_indicator_id for i in indicators if i.base_indicator_id]
    base_indicators = {}
    if base_ids:
        for bi in db.query(IndicatorDefinition).filter(IndicatorDefinition.id.in_(base_ids)).all():
            base_indicators[bi.id] = bi

    for year in request.years:
        query = db.query(FinancialData).filter(
            FinancialData.company_id == request.company_id,
            FinancialData.year == year
        )
        if request.quarter is not None:
            query = query.filter(FinancialData.quarter == request.quarter)
        else:
            query = query.filter(FinancialData.quarter.is_(None))
        raw = query.all()
        variables = {row.variable_name: row.value for row in raw}
        results[year] = {}

        for indicator in indicators:
            if indicator.agg_type in ('median', 'mean'):
                agg_years = indicator.agg_years or 5
                values = []
                if indicator.base_indicator_id:
                    base_ind = base_indicators.get(indicator.base_indicator_id)
                    if not base_ind:
                        results[year][indicator.display_name] = None
                        continue
                    for y in range(year - agg_years + 1, year + 1):
                        q = db.query(FinancialData).filter(
                            FinancialData.company_id == request.company_id,
                            FinancialData.year == y,
                            FinancialData.quarter.is_(None)
                        ).all()
                        vars_y = {row.variable_name: row.value for row in q}
                        val = calculate_indicator(base_ind.formula, vars_y)
                        if val is not None:
                            values.append(val)
                else:
                    for y in range(year - agg_years + 1, year + 1):
                        q = db.query(FinancialData).filter(
                            FinancialData.company_id == request.company_id,
                            FinancialData.year == y,
                            FinancialData.quarter.is_(None),
                            FinancialData.variable_name == indicator.formula
                        ).first()
                        if q and q.value is not None:
                            values.append(q.value)

                if not values:
                    results[year][indicator.display_name] = None
                elif indicator.agg_type == 'median':
                    values.sort()
                    n = len(values)
                    results[year][indicator.display_name] = round(
                        values[n // 2] if n % 2 else (values[n // 2 - 1] + values[n // 2]) / 2, 4
                    )
                else:
                    results[year][indicator.display_name] = round(sum(values) / len(values), 4)

            elif indicator.agg_type in ('yoy', 'change_n'):
                agg_years = indicator.agg_years or 1
                compare_year = year - 1 if indicator.agg_type == 'yoy' else year - agg_years

                if indicator.base_indicator_id:
                    base_ind = base_indicators.get(indicator.base_indicator_id)
                    if not base_ind:
                        results[year][indicator.display_name] = None
                        continue
                    q_curr = db.query(FinancialData).filter(
                        FinancialData.company_id == request.company_id,
                        FinancialData.year == year,
                        FinancialData.quarter.is_(None)
                    ).all()
                    q_prev = db.query(FinancialData).filter(
                        FinancialData.company_id == request.company_id,
                        FinancialData.year == compare_year,
                        FinancialData.quarter.is_(None)
                    ).all()
                    curr = calculate_indicator(base_ind.formula, {r.variable_name: r.value for r in q_curr})
                    prev = calculate_indicator(base_ind.formula, {r.variable_name: r.value for r in q_prev})
                else:
                    q_curr = db.query(FinancialData).filter(
                        FinancialData.company_id == request.company_id,
                        FinancialData.year == year,
                        FinancialData.quarter.is_(None),
                        FinancialData.variable_name == indicator.formula
                    ).first()
                    q_prev = db.query(FinancialData).filter(
                        FinancialData.company_id == request.company_id,
                        FinancialData.year == compare_year,
                        FinancialData.quarter.is_(None),
                        FinancialData.variable_name == indicator.formula
                    ).first()
                    curr = q_curr.value if q_curr else None
                    prev = q_prev.value if q_prev else None

                if curr is None or prev is None or prev == 0:
                    results[year][indicator.display_name] = None
                else:
                    results[year][indicator.display_name] = round((curr - prev) / abs(prev), 4)

            else:
                results[year][indicator.display_name] = calculate_indicator(indicator.formula, variables)

    return results