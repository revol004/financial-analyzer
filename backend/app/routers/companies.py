from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Company
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CompanyCreate(BaseModel):
    name: str
    ticker: str
    market: str = "GPW"
    description: Optional[str] = None

class CompanyResponse(BaseModel):
    id: int
    name: str
    ticker: str
    market: str
    description: Optional[str]
    class Config:
        from_attributes = True

@router.get("/", response_model=list[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()

@router.post("/", response_model=CompanyResponse)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    existing = db.query(Company).filter(Company.ticker == company.ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ticker already exists")
    db_company = Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}