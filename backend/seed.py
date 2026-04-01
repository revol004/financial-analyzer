from app.database import SessionLocal, engine, Base
from app.models.models import Company, FinancialData, IndicatorDefinition

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Sprawdź czy dane już istnieją
    if db.query(Company).count() > 0:
        db.close()
        return

    # Spółki
    companies = [
        Company(name="PKN Orlen", ticker="PKN", market="GPW", description="Największa polska spółka paliwowa"),
        Company(name="CD Projekt", ticker="CDR", market="GPW", description="Polski producent gier wideo"),
        Company(name="KGHM Polska Miedź", ticker="KGH", market="GPW", description="Producent miedzi i srebra"),
    ]
    for c in companies:
        db.add(c)
    db.commit()

    pkn = db.query(Company).filter(Company.ticker == "PKN").first()
    cdr = db.query(Company).filter(Company.ticker == "CDR").first()
    kgh = db.query(Company).filter(Company.ticker == "KGH").first()

    # Dane finansowe PKN Orlen (w mln PLN)
    pkn_data = {
        2022: {"revenue": 278887, "net_income": 13955, "operating_income": 16894, "equity": 62744, "total_assets": 155448, "current_assets": 55371, "total_liabilities": 92704, "current_liabilities": 45231},
        2023: {"revenue": 241100, "net_income": 10609, "operating_income": 13200, "equity": 71300, "total_assets": 163200, "current_assets": 51200, "total_liabilities": 91900, "current_liabilities": 42100},
        2024: {"revenue": 235000, "net_income": 8900, "operating_income": 11500, "equity": 78100, "total_assets": 170000, "current_assets": 49800, "total_liabilities": 91900, "current_liabilities": 40200},
    }

    # Dane finansowe CD Projekt (w mln PLN)
    cdr_data = {
        2022: {"revenue": 1084, "net_income": 233, "operating_income": 290, "equity": 3264, "total_assets": 3891, "current_assets": 1205, "total_liabilities": 627, "current_liabilities": 312},
        2023: {"revenue": 1429, "net_income": 481, "operating_income": 590, "equity": 3644, "total_assets": 4200, "current_assets": 1456, "total_liabilities": 556, "current_liabilities": 289},
        2024: {"revenue": 1100, "net_income": 320, "operating_income": 410, "equity": 3900, "total_assets": 4400, "current_assets": 1300, "total_liabilities": 500, "current_liabilities": 260},
    }

    # Dane finansowe KGHM (w mln PLN)
    kgh_data = {
        2022: {"revenue": 33718, "net_income": 3302, "operating_income": 4100, "equity": 28900, "total_assets": 48200, "current_assets": 12100, "total_liabilities": 19300, "current_liabilities": 8100},
        2023: {"revenue": 29800, "net_income": 1200, "operating_income": 1800, "equity": 29500, "total_assets": 49100, "current_assets": 11200, "total_liabilities": 19600, "current_liabilities": 7800},
        2024: {"revenue": 31200, "net_income": 1800, "operating_income": 2400, "equity": 30100, "total_assets": 50200, "current_assets": 11800, "total_liabilities": 20100, "current_liabilities": 8200},
    }

    for company, data in [(pkn, pkn_data), (cdr, cdr_data), (kgh, kgh_data)]:
        for year, variables in data.items():
            for var_name, value in variables.items():
                db.add(FinancialData(
                    company_id=company.id,
                    year=year,
                    variable_name=var_name,
                    value=value
                ))

    # Wskaźniki
    indicators = [
        IndicatorDefinition(name="roe", display_name="ROE", formula="net_income / equity", description="Zwrot z kapitału własnego", category="Rentowność"),
        IndicatorDefinition(name="roa", display_name="ROA", formula="net_income / total_assets", description="Zwrot z aktywów", category="Rentowność"),
        IndicatorDefinition(name="marza_netto", display_name="Marża netto", formula="net_income / revenue", description="Marża zysku netto", category="Rentowność"),
        IndicatorDefinition(name="marza_operacyjna", display_name="Marża operacyjna", formula="operating_income / revenue", description="Marża zysku operacyjnego", category="Rentowność"),
        IndicatorDefinition(name="current_ratio", display_name="Current Ratio", formula="current_assets / current_liabilities", description="Wskaźnik płynności bieżącej", category="Płynność"),
        IndicatorDefinition(name="debt_ratio", display_name="Debt Ratio", formula="total_liabilities / total_assets", description="Wskaźnik zadłużenia", category="Zadłużenie"),
    ]
    for ind in indicators:
        db.add(ind)

    db.commit()
    db.close()
    print("✅ Baza danych wypełniona przykładowymi danymi!")

if __name__ == "__main__":
    seed()