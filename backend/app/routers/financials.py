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
    quarter: Optional[int] = None
    variable_name: str
    value: float


class FinancialDataResponse(BaseModel):
    id: int
    company_id: int
    year: int
    quarter: Optional[int] = None
    variable_name: str
    value: float

    class Config:
        from_attributes = True


@router.delete("/variable/{variable_name}")
def delete_variable(variable_name: str, db: Session = Depends(get_db)):
    deleted = (
        db.query(FinancialData)
        .filter(FinancialData.variable_name == variable_name)
        .delete()
    )
    db.commit()
    return {"message": f"Deleted {deleted} records for variable '{variable_name}'"}


@router.delete("/cleanup/quarter-variable")
def cleanup_quarter_variable(db: Session = Depends(get_db)):
    """Clean up old data where 'quarter' was imported as a variable instead of a field"""
    deleted = (
        db.query(FinancialData)
        .filter(FinancialData.variable_name == "quarter")
        .delete()
    )
    db.commit()
    return {"message": f"Cleaned up {deleted} 'quarter' variable records"}


@router.get("/{company_id}")
def get_financials(
    company_id: int, quarter: Optional[int] = None, db: Session = Depends(get_db)
):
    query = db.query(FinancialData).filter(FinancialData.company_id == company_id)

    # Filter by quarter if specified, otherwise only return annual data (quarter is None)
    if quarter is not None:
        query = query.filter(FinancialData.quarter == quarter)
    else:
        query = query.filter(FinancialData.quarter.is_(None))

    data = query.all()
    result = {}

    # Organize by year, then by variable name (simple flat structure)
    for row in data:
        if row.year not in result:
            result[row.year] = {}

        # Skip if variable_name is "quarter" (cleanup old bad data)
        if row.variable_name == "quarter":
            continue

        result[row.year][row.variable_name] = row.value

    return result


@router.post("/", response_model=FinancialDataResponse)
def upsert_financial(data: FinancialDataCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(FinancialData)
        .filter(
            FinancialData.company_id == data.company_id,
            FinancialData.year == data.year,
            FinancialData.quarter == data.quarter,
            FinancialData.variable_name == data.variable_name,
        )
        .first()
    )
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
def import_csv(
    company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    try:
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
            raise HTTPException(
                status_code=400, detail="File must contain 'year' column"
            )

        # Auto-detect if this is quarterly or yearly data
        has_quarter = "quarter" in df.columns

        print(f"📋 File columns: {list(df.columns)}")
        print(f"🔍 Has quarter column: {has_quarter}")

        imported = 0
        for idx, row in df.iterrows():
            try:
                # Sprawdź czy rok jest pusty (NaN)
                if pd.isna(row["year"]):
                    print(f"⚠️  Pominąłem wiersz {idx + 2}: rok jest pusty")
                    continue

                year = int(float(row["year"]))
            except (ValueError, TypeError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Błąd w wierszu {idx + 2}: Invalid year value: {str(e)}",
                )

            # Extract quarter if present
            quarter = None
            if has_quarter:
                try:
                    quarter_val = row["quarter"]
                    print(
                        f"  Row {idx + 2}: year={year}, quarter_val={quarter_val} (type: {type(quarter_val)})"
                    )

                    if pd.isna(quarter_val):
                        quarter = None
                    else:
                        # Handle both "1" and "Q1" format
                        quarter_str = str(quarter_val).strip().upper()
                        if quarter_str.startswith("Q"):
                            quarter = int(quarter_str[1])
                        else:
                            quarter = int(float(quarter_val))

                        if quarter < 1 or quarter > 4:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Błąd w wierszu {idx + 2}: Quarter must be 1-4, got {quarter}",
                            )
                        print(f"    ✓ Parsed quarter: {quarter}")
                except (ValueError, TypeError) as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Błąd w wierszu {idx + 2}: Invalid quarter value '{quarter_val}': {str(e)}",
                    )

            for col in df.columns:
                if col in ["year", "quarter"]:
                    continue

                try:
                    value = float(row[col])
                except (ValueError, TypeError):
                    # Skip non-numeric values
                    continue

                existing = (
                    db.query(FinancialData)
                    .filter(
                        FinancialData.company_id == company_id,
                        FinancialData.year == year,
                        FinancialData.quarter == quarter,
                        FinancialData.variable_name == col,
                    )
                    .first()
                )
                if existing:
                    existing.value = value
                else:
                    db.add(
                        FinancialData(
                            company_id=company_id,
                            year=year,
                            quarter=quarter,
                            variable_name=col,
                            value=value,
                        )
                    )
                imported += 1

        db.commit()
        print(f"✅ Import complete: {imported} records")
        return {"message": f"Imported {imported} records"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")
