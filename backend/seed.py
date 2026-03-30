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
        2022: {"przychody": 278887, "zysk_netto": 13955, "zysk_operacyjny": 16894, "kapital_wlasny": 62744, "aktywa_ogółem": 155448, "aktywa_obrotowe": 55371, "zobowiazania_ogółem": 92704, "zobowiazania_krotkoterminowe": 45231},
        2023: {"przychody": 241100, "zysk_netto": 10609, "zysk_operacyjny": 13200, "kapital_wlasny": 71300, "aktywa_ogółem": 163200, "aktywa_obrotowe": 51200, "zobowiazania_ogółem": 91900, "zobowiazania_krotkoterminowe": 42100},
        2024: {"przychody": 235000, "zysk_netto": 8900, "zysk_operacyjny": 11500, "kapital_wlasny": 78100, "aktywa_ogółem": 170000, "aktywa_obrotowe": 49800, "zobowiazania_ogółem": 91900, "zobowiazania_krotkoterminowe": 40200},
    }

    # Dane finansowe CD Projekt (w mln PLN)
    cdr_data = {
        2022: {"przychody": 1084, "zysk_netto": 233, "zysk_operacyjny": 290, "kapital_wlasny": 3264, "aktywa_ogółem": 3891, "aktywa_obrotowe": 1205, "zobowiazania_ogółem": 627, "zobowiazania_krotkoterminowe": 312},
        2023: {"przychody": 1429, "zysk_netto": 481, "zysk_operacyjny": 590, "kapital_wlasny": 3644, "aktywa_ogółem": 4200, "aktywa_obrotowe": 1456, "zobowiazania_ogółem": 556, "zobowiazania_krotkoterminowe": 289},
        2024: {"przychody": 1100, "zysk_netto": 320, "zysk_operacyjny": 410, "kapital_wlasny": 3900, "aktywa_ogółem": 4400, "aktywa_obrotowe": 1300, "zobowiazania_ogółem": 500, "zobowiazania_krotkoterminowe": 260},
    }

    # Dane finansowe KGHM (w mln PLN)
    kgh_data = {
        2022: {"przychody": 33718, "zysk_netto": 3302, "zysk_operacyjny": 4100, "kapital_wlasny": 28900, "aktywa_ogółem": 48200, "aktywa_obrotowe": 12100, "zobowiazania_ogółem": 19300, "zobowiazania_krotkoterminowe": 8100},
        2023: {"przychody": 29800, "zysk_netto": 1200, "zysk_operacyjny": 1800, "kapital_wlasny": 29500, "aktywa_ogółem": 49100, "aktywa_obrotowe": 11200, "zobowiazania_ogółem": 19600, "zobowiazania_krotkoterminowe": 7800},
        2024: {"przychody": 31200, "zysk_netto": 1800, "zysk_operacyjny": 2400, "kapital_wlasny": 30100, "aktywa_ogółem": 50200, "aktywa_obrotowe": 11800, "zobowiazania_ogółem": 20100, "zobowiazania_krotkoterminowe": 8200},
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
        IndicatorDefinition(name="roe", display_name="ROE", formula="zysk_netto / kapital_wlasny", description="Zwrot z kapitału własnego", category="Rentowność"),
        IndicatorDefinition(name="roa", display_name="ROA", formula="zysk_netto / aktywa_ogółem", description="Zwrot z aktywów", category="Rentowność"),
        IndicatorDefinition(name="marza_netto", display_name="Marża netto", formula="zysk_netto / przychody", description="Marża zysku netto", category="Rentowność"),
        IndicatorDefinition(name="marza_operacyjna", display_name="Marża operacyjna", formula="zysk_operacyjny / przychody", description="Marża zysku operacyjnego", category="Rentowność"),
        IndicatorDefinition(name="current_ratio", display_name="Current Ratio", formula="aktywa_obrotowe / zobowiazania_krotkoterminowe", description="Wskaźnik płynności bieżącej", category="Płynność"),
        IndicatorDefinition(name="debt_ratio", display_name="Debt Ratio", formula="zobowiazania_ogółem / aktywa_ogółem", description="Wskaźnik zadłużenia", category="Zadłużenie"),
    ]
    for ind in indicators:
        db.add(ind)

    db.commit()
    db.close()
    print("✅ Baza danych wypełniona przykładowymi danymi!")

if __name__ == "__main__":
    seed()