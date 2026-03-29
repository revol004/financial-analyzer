from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import FinancialData, Company
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import io

router = APIRouter()

class FinancialDataCreate(BaseModel):
    company_id: int
    year: int
    variable_name: str
    value: float

class FinancialDataResponse(BaseModel):
    id: int
    company_id: int
    year: int
    variable_name: str
    value: float
    class Config:
        from_attributes = True

@router.get("/{company_id}")
def get_financials(company_id: int, db: Session = Depends(get_db)):
    data = db.query(FinancialData).filter(FinancialData.company_id == company_id).all()
    result = {}
    for row in data:
        if row.year not in result:
            result[row.year] = {}
        result[row.year][row.variable_name] = row.value
    return result

@router.post("/", response_model=FinancialDataResponse)
def upsert_financial(data: FinancialDataCreate, db: Session = Depends(get_db)):
    existing = db.query(FinancialData).filter(
        FinancialData.company_id == data.company_id,
        FinancialData.year == data.year,
        FinancialData.variable_name == data.variable_name
    ).first()
    if existing:
        existing.value = data.value
        db.commit()
        db.refresh(existing)
        return existing
    db_data = FinancialData(**data.model_dump())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data

@router.post("/import/{company_id}")
def import_csv(company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    content = file.file.read()
    try:
        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File error: {str(e)}")
    if "year" not in df.columns:
        raise HTTPException(status_code=400, detail="File must contain 'year' column")
    imported = 0
    for _, row in df.iterrows():
        year = int(row["year"])
        for col in df.columns:
            if col == "year":
                continue
            existing = db.query(FinancialData).filter(
                FinancialData.company_id == company_id,
                FinancialData.year == year,
                FinancialData.variable_name == col
            ).first()
            if existing:
                existing.value = float(row[col])
            else:
                db.add(FinancialData(company_id=company_id, year=year, variable_name=col, value=float(row[col])))
            imported += 1
    db.commit()
    return {"message": f"Imported {imported} records"}