# Financial Analyzer - Kompletna Dokumentacja Kodu

## 📋 Spis Treści
1. [Przegląd Projektu](#przegląd-projektu)
2. [Architektura Systemu](#architektura-systemu)
3. [Backend - Szczegółowa Dokumentacja](#backend---szczegółowa-dokumentacja)
4. [Frontend - Szczegółowa Dokumentacja](#frontend---szczegółowa-dokumentacja)
5. [Flow Danych](#flow-danych)
6. [Ważne Koncepcje](#ważne-koncepcje)
7. [Guides Rozszerzeń](#guides-rozszerzeń)

---

## Przegląd Projektu

**Financial Analyzer** to aplikacja webowa do analizy danych finansowych przedsiębiorstw. Umożliwia:
- Zarządzanie danymi finansowymi spółek (rocznymi i kwartalnymi)
- Definiowanie wskaźników finansowych za pomocą formuł
- Tworzenie grup wskaźników dla wygodnego zaznaczania
- Obliczanie wskaźników w trybie rocznym lub kwartalnym
- Wizualizacja wyników na wykresach

**Tech Stack:**
- **Backend:** FastAPI (Python 3.14), SQLAlchemy ORM, SQLite/PostgreSQL
- **Frontend:** React 18, TypeScript, Material-UI v5
- **Deployment:** Render.com (backend), Vercel (frontend)

---

## Architektura Systemu

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  App.tsx → Navbar → Routes (Dashboard/Companies/Indicators)
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Backend (FastAPI)                           │
│  main.py → Routers (companies/financials/indicators)    │
│             ↓                                            │
│         SQLAlchemy ORM                                  │
│         ↓                                               │
│    Database (SQLite/PostgreSQL)                        │
└─────────────────────────────────────────────────────────┘
```

### API Endpoints

#### Spółki (`/api/companies`)
- `GET /` - Pobrać wszystkie spółki
- `POST /` - Stworzyć nową spółkę
- `PUT /{id}` - Zaktualizować spółkę
- `DELETE /{id}` - Usunąć spółkę (kasuje też dane finansowe)

#### Dane Finansowe (`/api/financials`)
- `GET /{company_id}?quarter=N` - Pobrać dane finansowe (quarter opcjonalny dla danych rocznych/kwartalnych)
- `POST /` - Utworzyć/zaktualizować dane finansowe
- `DELETE /variable/{name}` - Usunąć wszystkie rekordy zmiennej
- `POST /import/{company_id}` - Importować dane z pliku Excel
- `DELETE /cleanup/quarter-variable` - Wyczyścić stare dane

#### Wskaźniki (`/api/indicators`)
- `GET /` - Pobrać wszystkie wskaźniki
- `POST /` - Stworzyć nowy wskaźnik
- `PATCH /{id}` - Zaktualizować wskaźnik
- `DELETE /{id}` - Usunąć wskaźnik
- **`POST /calculate`** - KLUCZOWY ENDPOINT: Obliczyć wskaźniki dla spółki/lat/kwartałów
- `DELETE /variable/{name}` - Usunąć zmienną (tylko dla wskaźników)

#### Grupy Wskaźników (`/api/indicators/groups`)
- `GET /` - Pobrać wszystkie grupy
- `GET /{id}` - Pobrać grupę
- `POST /` - Stworzyć grupę
- `PATCH /{id}` - Zaktualizować grupę
- `DELETE /{id}` - Usunąć grupę

---

## Backend - Szczegółowa Dokumentacja

### 1. **database.py** - Konfiguracja Bazy Danych

```python
# Cel: Zarządzanie połączeniem z bazą danych i sesją SQLAlchemy

DATABASE_URL = "sqlite:///./financial_analyzer.db"  # Domyślnie SQLite
# Konwersja: postgres:// → postgresql:// (wymóg Render.com)
engine = create_engine(DATABASE_URL, connect_args=...)
SessionLocal = sessionmaker(...)  # Fabryka sesji
Base = declarative_base()  # Klasa bazowa dla ORM

def get_db():
    """Dependency injection dla FastAPI - dostarcza sesję do endpointów"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Kluczowe punkty:**
- Obsługuje SQLite (dev) i PostgreSQL (prod)
- `get_db()` wstrzykuje sesję jako dependency w routerach

### 2. **models.py** - Modele Danych (SQLAlchemy ORM)

#### 2.1 Company (Spółka)
```python
class Company(Base):
    id: int (PK)
    name: str (unique) - Nazwa spółki
    ticker: str (unique) - Ticker giełdowy
    market: str = "GPW" - Rynek giełdowy
    description: str (optional) - Opis
    financials: List[FinancialData] - Relacja one-to-many
```

**Użycie:** Przechowuje podstawowe informacje o spółkach analizowanych w systemie

#### 2.2 FinancialData (Dane Finansowe)
```python
class FinancialData(Base):
    id: int (PK)
    company_id: int (FK) - Wskaźnik na spółkę
    year: int - Rok danych
    quarter: int (optional) - Kwartał (1-4) dla danych kwartalnych, NULL dla rocznych
    variable_name: str - Nazwa zmiennej (np. "revenue", "net_income")
    value: float - Wartość numeryczna
```

**Wzór danych:**
```
Company: Apple Inc.
  ├─ FinancialData: year=2023, quarter=NULL, revenue=383285
  ├─ FinancialData: year=2023, quarter=1, revenue=94736
  ├─ FinancialData: year=2023, quarter=2, revenue=81797
  └─ ...
```

#### 2.3 IndicatorDefinition (Definicja Wskaźnika)
```python
class IndicatorDefinition(Base):
    id: int (PK)
    name: str (unique) - Wewnętrzna nazwa (np. "roe")
    display_name: str - Wyświetlana nazwa (np. "Return on Equity")
    formula: str - Formuła (np. "net_income / equity")
    description: str (optional) - Wyjaśnienie
    category: str (optional) - Kategoria (np. "Profitability")
    is_percentage: int - Czy wynik to procent (1/0)
    agg_type: str (optional) - Typ agregacji ("mean", "median", "yoy", "count_if")
    agg_years: int (optional) - Liczba lat do agregacji
    base_indicator_id: int (FK optional) - Dla wskaźników agregowanych
```

**Przykłady wskaźników:**
```
- ROE: "net_income / equity" (Rentowność kapitału)
- ROA: "net_income / total_assets" (Rentowność aktywów)
- Current Ratio: "current_assets / current_liabilities" (Płynność)
```

#### 2.4 IndicatorGroup (Grupa Wskaźników)
```python
class IndicatorGroup(Base):
    id: int (PK)
    name: str (unique) - Nazwa grupy
    description: str (optional) - Opis
    indicator_ids: JSON - Lista ID wskaźników [1, 5, 8, 12]
```

**Użycie:** Umożliwia użytkownikowi grupować wskaźniki dla szybszego zaznaczania

### 3. **calculator.py** - Serwis Obliczeń

```python
def calculate_indicator(formula: str, variables: dict) -> float | None:
    """
    Bezpiecznie oblicza wskaźnik finansowy
    
    Wejście:
        formula: "net_income / equity"
        variables: {"net_income": 1000000, "equity": 5000000}
    
    Wyjście: 0.2 (zaokrąglone do 4 miejsc)
    
    Dostępne funkcje: max, min, abs, round, sqrt, log, pow, exp
    """
    safe_functions = {
        "max": max, "min": min, "abs": abs, "round": round,
        "sqrt": math.sqrt, "log": math.log, "pow": math.pow
    }
    context = {**safe_functions, **variables}
    result = eval(formula, {"__builtins__": {}}, context)  # Bezpieczna ocena
    return round(float(result), 4)
```

**Bezpieczeństwo:**
- Blokuje dostęp do `__builtins__` (uniemożliwia niebezpieczne operacje)
- Obsługuje dzielenie przez zero (zwraca None)
- Obsługuje błędy (zwraca None)

### 4. **routers/companies.py** - Zarządzanie Spółkami

```python
# Modele Pydantic (walidacja i serializacja)
class CompanyCreate(BaseModel):
    name: str
    ticker: str
    market: str = "GPW"
    description: Optional[str]

class CompanyResponse(BaseModel):
    id: int
    name: str
    ...
```

**Endpointy:**

| Metoda | Endpoint | Funkcja |
|--------|----------|---------|
| GET | `/api/companies/` | Pobrać listę wszystkich spółek |
| POST | `/api/companies/` | Stworzyć nową spółkę (walidacja unikalności ticker) |
| PUT | `/api/companies/{id}` | Zaktualizować dane spółki |
| DELETE | `/api/companies/{id}` | Usunąć spółkę + kaskadowe usunięcie danych finansowych |

### 5. **routers/financials.py** - Dane Finansowe

**Funkcjonalność:**
- **GET** `/{company_id}?quarter=2` - Pobiera dane dla spółki
  - Jeśli `quarter` = NULL: zwraca dane roczne
  - Jeśli `quarter` = 1-4: zwraca dane dla tego kwartału
  - Organizuje wynik: `{rok: {zmienna: wartość}}`

- **POST** `/` - Upsert danych (tworzy lub aktualizuje)

- **DELETE** `/variable/{name}` - Usuwa wszystkie rekordy zmiennej (np. "revenue")

- **POST** `/import/{company_id}` - Import z Excel (form-data)
  - Obsługuje strukturę: Columns = zmienne, Rows = lata/kwartały

### 6. **routers/indicators.py** - SERCE APLIKACJI

#### 6.1 Modele
```python
class IndicatorCreate(BaseModel):
    name: str
    display_name: str
    formula: str
    category: Optional[str]
    is_percentage: int = 1
    agg_type: Optional[str]  # "mean", "median", "yoy", "count_if"
    agg_years: Optional[int]
    base_indicator_id: Optional[int]

class CalculateRequest(BaseModel):
    company_id: int
    indicator_ids: list[int]  # Które wskaźniki obliczyć
    years: list[int]  # Które lata
    quarter: Optional[int]  # Kwartał (jeśli tryb kwartalny)
```

#### 6.2 Obliczanie Wskaźników (POST /calculate)

**Proces:**
1. Pobranie danych finansowych dla spółki/roku/kwartału
2. Dla każdego wskaźnika:
   - Jeśli zwykły: bezpośrednie obliczenie z `calculate_indicator()`
   - Jeśli agregujący: specjalna logika

**Typy agregacji:**
- **mean**: Średnia z N lat
- **median**: Mediana z N lat
- **yoy**: Year-over-year zmiana ([(curr-prev)/abs(prev)])
- **count_if**: Zliczenie lat spełniających warunek

**Przykład Request:**
```json
{
  "company_id": 1,
  "indicator_ids": [1, 2, 5],
  "years": [2021, 2022, 2023],
  "quarter": null
}
```

**Przykład Response:**
```json
{
  "2021": {
    "ROE": 0.1523,
    "ROA": 0.0842,
    "Current Ratio": 1.2341
  },
  "2022": { ... },
  "2023": { ... }
}
```

#### 6.3 Grupy Wskaźników

- **GET** `/groups` - Wszystkie grupy
- **POST** `/groups` - Stworzyć grupę
- **PATCH** `/groups/{id}` - Zaktualizować
- **DELETE** `/groups/{id}` - Usunąć

### 7. **main.py** - Punkt Wejścia Aplikacji

```python
# Tworzy tabele w bazie (jeśli nie istnieją)
Base.metadata.create_all(bind=engine)

# Uruchamia seed (populate domyślnymi danymi)
from seed import seed
seed()

# Tworzy instancję FastAPI
app = FastAPI(title="Financial Analyzer API")

# CORS - zezwala na requesty z frontend'u
app.add_middleware(CORSMiddleware, 
    allow_origins=[
        "http://localhost:3000",  # Dev
        "https://financial-analyzer-eight.vercel.app"  # Prod
    ]
)

# Rejestruje routery
app.include_router(companies.router, prefix="/api/companies")
app.include_router(financials.router, prefix="/api/financials")
app.include_router(indicators.router, prefix="/api/indicators")
```

---

## Frontend - Szczegółowa Dokumentacja

### 1. **src/index.tsx** - Punkt Wejścia React

```typescript
// Renduje komponent App do DOM
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 2. **src/App.tsx** - Root Komponent

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },      // Niebieski
    secondary: { main: '#f57c00' },    // Pomarańczowy
    background: { default: '#f5f5f5' } // Szary
  }
});

export default function App() {
  const [mode, setMode] = useState<'annual' | 'quarterly'>('annual');
  
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Navbar mode={mode} onModeChange={setMode} />
        <Routes>
          <Route path="/" element={<Dashboard mode={mode} />} />
          <Route path="/companies" element={<Companies mode={mode} />} />
          <Route path="/indicators" element={<Indicators />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

**Kluczowe:**
- `mode` = global state dla trybu annual/quarterly
- Material-UI ThemeProvider dla spójnego UI

### 3. **src/services/api.ts** - Klient API

```typescript
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Grupy API dla różnych zasobów
export const companiesApi = {
  getAll: () => API.get('/companies/'),
  create: (data) => API.post('/companies/', data),
  delete: (id) => API.delete(`/companies/${id}`),
  update: (id, data) => API.put(`/companies/${id}`, data),
};

export const financialsApi = {
  getByCompany: (companyId, quarter?) => API.get(`/financials/${companyId}`, {...}),
  upsert: (data) => API.post('/financials/', data),
  import: (companyId, file) => { /* form-data upload */ },
  deleteVariable: (name) => API.delete(`/financials/variable/${name}`),
};

export const indicatorsApi = {
  getAll: () => API.get('/indicators/'),
  create: (data) => API.post('/indicators/', data),
  calculate: (data) => API.post('/indicators/calculate', data),  // KLUCZOWY
  delete: (id) => API.delete(`/indicators/${id}`),
  update: (id, data) => API.patch(`/indicators/${id}`, data),
  getGroups: () => API.get('/indicators/groups'),
  createGroup: (data) => API.post('/indicators/groups', data),
  updateGroup: (id, data) => API.patch(`/indicators/groups/${id}`, data),
  deleteGroup: (id) => API.delete(`/indicators/groups/${id}`),
};
```

### 4. **src/components/Navbar.tsx** - Nawigacja

```typescript
interface Props {
  mode: 'annual' | 'quarterly';
  onModeChange: (mode: 'annual' | 'quarterly') => void;
}

export default function Navbar({ mode, onModeChange }) {
  return (
    <AppBar>
      <Toolbar>
        <Typography variant="h6">Financial Analyzer</Typography>
        <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
          <Link to="/">Dashboard</Link>
          <Link to="/companies">Spółki</Link>
          <Link to="/indicators">Wskaźniki</Link>
        </Box>
        
        {/* Toggle Annual/Quarterly */}
        <FormControlLabel
          label={mode === 'annual' ? 'Rokami' : 'Kwartałami'}
          control={
            <Switch
              checked={mode === 'quarterly'}
              onChange={(e) => onModeChange(e.target.checked ? 'quarterly' : 'annual')}
            />
          }
        />
      </Toolbar>
    </AppBar>
  );
}
```

### 5. **src/pages/Dashboard.tsx** - Strona Główna

**Stan (State):**
```typescript
const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
const [selectedYears, setSelectedYears] = useState<number[]>([]);
const [selectedQuarterYears, setSelectedQuarterYears] = useState<number[]>([]);
const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
const [selectedIndicators, setSelectedIndicators] = useState<number[]>([]);
const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
const [results, setResults] = useState<Record<number, any>>({});
```

**Sekcje UI:**

#### 5.1 Wybór Spółek
```typescript
// Multi-select dropdown z listą wszystkich spółek
<Select multiple value={selectedCompanies} onChange={...}>
  {companies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
</Select>
```

#### 5.2 Wybór Lat/Kwartałów

**Tryb Annual (roczny):**
```typescript
// Grid z checkboxami dla lat
<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
  {YEARS.map(y => (
    <FormControlLabel
      control={<Checkbox checked={selectedYears.includes(y)} onChange={...} />}
      label={y}
    />
  ))}
</Box>
```

**Tryb Quarterly (kwartalny):**
```typescript
// 2a. Wybierz lata (filtrowanie)
<Grid z checkboxami dla lat do filtrowania kwartałów>

// 2b. Wybierz kwartały (filtrowane po wybranych latach)
<Grid z checkboxami dla kwartałów (tylko ze wybranych lat)>

// Shift+Click support: handleQuarterClick() zaznacza zakres
```

#### 5.3 Wybór Wskaźników

**Jeśli istnieją grupy:**
```typescript
// Dropdown: Grupy wskaźników (opcjonalnie)
// Wybór grupy → auto-populate selectedIndicators
// Ręczny select → clear group selection
```

**Bez grup lub custom select:**
```typescript
// Tab interface z kategoriami
// FormGroup z checkboxami dla każdego wskaźnika
```

#### 5.4 Przycisk Oblicz

```typescript
const handleCalculate = async () => {
  const payload = {
    company_id: selectedCompanies[0],
    indicator_ids: selectedIndicators,
    years: selectedYears,
    quarter: mode === 'quarterly' ? selectedQuarters[0]?.split(' ')[0] : null
  };
  
  const response = await indicatorsApi.calculate(payload);
  setResults(response); // {2023: {ROE: 0.15, ...}, ...}
};
```

#### 5.5 Tabela Wyników

```typescript
// TableContainer z wierszami dla lat, kolumnami dla wskaźników
<Table>
  <TableHead>
    <TableRow>
      <TableCell>Rok</TableCell>
      {indicators.map(i => <TableCell key={i.id}>{i.display_name}</TableCell>)}
    </TableRow>
  </TableHead>
  <TableBody>
    {sortedYears.map(year => (
      <TableRow key={year}>
        <TableCell>{year}</TableCell>
        {indicators.map(i => <TableCell>{results[year]?.[i.display_name]}</TableCell>)}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 5.6 Wykres

```typescript
<IndicatorChart
  data={results}
  indicators={selectedIndicators}
  years={sortedYears}
/>
```

### 6. **src/pages/Companies.tsx** - Zarządzanie Spółkami

**Funkcjonalność:**
- **Tabela** z listą spółek (nazwa, ticker, rynek)
- **Guziki:** Dodaj, Edytuj, Usuń
- **Dialog** do dodawania/edytowania
- **FinancialDataDialog** do wgrywania danych finansowych

```typescript
const handleAddCompany = async () => {
  await companiesApi.create({
    name: formData.name,
    ticker: formData.ticker,
    market: formData.market
  });
  fetchCompanies();
};

const handleUploadFinancials = (file: File, companyId: number) => {
  await financialsApi.import(companyId, file);  // Excel upload
};
```

### 7. **src/pages/Indicators.tsx** - Zarządzanie Wskaźnikami

**Funkcjonalność:**
- **Tabela** z listą wskaźników
- **CRUD operacje:** Dodaj, Edytuj, Usuń
- **Zarządzanie Grupami** (dialog)
- **Inicjalizacja domyślnych wskaźników**

```typescript
const handleCreateIndicator = async () => {
  await indicatorsApi.create({
    name: form.name,
    display_name: form.display_name,
    formula: form.formula,
    category: form.category,
    is_percentage: form.is_percentage
  });
  fetchIndicators();
};

const handleGroupSubmit = async () => {
  await indicatorsApi.createGroup({
    name: groupForm.name,
    description: groupForm.description,
    indicator_ids: groupForm.indicator_ids
  });
  fetchGroups();
};
```

### 8. **src/components/FinancialDataDialog.tsx** - Dialog Danych Finansowych

```typescript
// Dialog do wprowadzania danych finansowych
// Tabela z wierszami dla lat, kolumnami dla zmiennych

interface Props {
  company: Company;
  open: boolean;
  onClose: () => void;
}

// Funkcjonalność:
// - Wyświetla dane istniejące z backendu
// - Umożliwia edycję i dodawanie nowych wartości
// - Przycisk "Zachowaj" → PUT requesty
// - Przycisk "Dodaj rok" → localStorage + UI
```

### 9. **src/components/ManageVariablesDialog.tsx** - Dialog Zmiennych

```typescript
// Dialog do zarządzania zmiennymi finansowymi
// - Lista zmiennych dostępnych w projekcie
// - Przycisk "Usuń" dla każdej zmiennej
// - Walidacja: nie można usunąć używanej w formułach
```

### 10. **src/components/IndicatorChart.tsx** - Wykresy

```typescript
interface Props {
  data: Record<number, any>;  // {2023: {ROE: 0.15, ROA: 0.08}, ...}
  indicators: number[];        // ID wybranych wskaźników
  years: number[];             // Wybrane lata
}

// Renderuje Recharts LineChart dla każdego wskaźnika
// X-axis: lata, Y-axis: wartość wskaźnika
```

---

## Flow Danych

### Scenario 1: Obliczanie Wskaźników

```
1. Użytkownik w Dashboard:
   - Wybiera spółkę (Company 1)
   - Wybiera lata (2021, 2022, 2023)
   - Wybiera wskaźniki (ROE, ROA)

2. Klik "Oblicz" → handleCalculate()
   
3. Request do API:
   POST /api/indicators/calculate
   {
     "company_id": 1,
     "indicator_ids": [1, 2],
     "years": [2021, 2022, 2023],
     "quarter": null
   }

4. Backend (indicators.py - POST /calculate):
   - Dla każdego roku (2021, 2022, 2023):
     - Pobiera FinancialData dla (company_id=1, year=Y, quarter=null)
     - Dla każdego wskaźnika:
       - Buduje słownik zmiennych: {revenue: 100000, equity: 500000, ...}
       - Oblicza: calculate_indicator("net_income / equity", variables)
     - Zwraca: {2021: {ROE: 0.2, ROA: 0.1}, 2022: {...}, ...}

5. Frontend odbiera response:
   - setResults(response)
   - Renderuje tabelę z wynikami
   - Renderuje wykresy
```

### Scenario 2: Import Danych Finansowych

```
1. Użytkownik: Companies → Edytuj spółkę → "Dodaj dane" → wybrać Excel

2. Excel struktura:
   | Zmienna/Rok | 2023 | 2022 | 2021 |
   |-------------|------|------|------|
   | revenue     | 1000 | 950  | 900  |
   | net_income  | 200  | 190  | 180  |

3. File Upload:
   POST /api/financials/import/1
   (Form-Data: file=excel.xlsx)

4. Backend (financials.py):
   - Parsuje Excel z pandas
   - Dla każdej kolumny (rok) i wiersza (zmienna):
     - POST /api/financials/
       { company_id: 1, year: 2023, quarter: null, 
         variable_name: "revenue", value: 1000 }
   - Upsert (jeśli istnieje, update; jeśli nie, create)

5. Frontend: refresh danych, notify success
```

### Scenario 3: Zarządzanie Grupami Wskaźników

```
1. Użytkownik: Indicators → "Grupy wskaźników" → "Dodaj grupę"

2. Wpisuje:
   - Nazwa: "Rentowność"
   - Wskaźniki: [ROE, ROA, Net Margin]

3. Request:
   POST /api/indicators/groups
   { "name": "Rentowność", "indicator_ids": [1, 2, 3] }

4. Backend:
   - Tworzy IndicatorGroup(name="Rentowność", indicator_ids=[1,2,3])
   - Zwraca: { id: 5, name: "Rentowność", indicator_ids: [1,2,3] }

5. Użytkownik w Dashboard:
   - Wybiera grupę "Rentowność" (dropdown)
   - Auto-populate: selectedIndicators = [1, 2, 3]
   - Klik "Oblicz"

6. Jeśli użytkownik ręcznie zmienia wskaźniki:
   - Clear selectedGroup (ustawić na '')
   - Pokazać user feedback
```

---

## Ważne Koncepcje

### 1. Wskaźniki Agregujące

Oprócz zwykłych wskaźników (bezpośredni wzór), system obsługuje **wskaźniki agregujące** obliczane z kilku lat:

```python
# Przykład: "5-Year Average ROE"
indicator = IndicatorDefinition(
    name="roe_5yr_avg",
    display_name="5-Year Average ROE",
    agg_type="mean",  # Średnia
    agg_years=5,      # Z 5 lat
    base_indicator_id=1  # Bazuje na ROE (indicator_id=1)
)

# Obliczenie dla 2023:
# 1. Oblicz ROE dla 2023, 2022, 2021, 2020, 2019
# 2. Średnia = (0.15 + 0.14 + 0.16 + 0.13 + 0.12) / 5 = 0.14
```

**Dostępne typy:**
- **mean**: Średnia arytmetyczna
- **median**: Mediana
- **yoy**: Year-over-year zmiana: (curr - prev) / |prev|
- **count_if**: Zliczanie lat spełniających warunek

### 2. Dane Roczne vs Kwartalne

```python
# Dane roczne (quarter = NULL)
FinancialData(company_id=1, year=2023, quarter=None, 
              variable_name="revenue", value=1000000)

# Dane kwartalne (quarter = 1-4)
FinancialData(company_id=1, year=2023, quarter=1, 
              variable_name="revenue", value=250000)
FinancialData(company_id=1, year=2023, quarter=2, 
              variable_name="revenue", value=260000)
...

# Pobranie:
GET /api/financials/1?quarter=null  → dane roczne
GET /api/financials/1?quarter=1     → dane Q1
```

### 3. Bezpieczeństwo Formuł

```python
# Bezpieczne:
calculate_indicator("net_income / equity", {...})
calculate_indicator("sqrt(revenue) + 100", {...})

# Niebezpieczne (BLOKOWANE):
calculate_indicator("__import__('os').system('rm -rf /')", {...})
# eval() ma __builtins__ = {} → nie dostęp do dangerous functions

# Division by zero:
calculate_indicator("1 / 0", {...})  # → None (nie crash)

# Unknown variable:
calculate_indicator("unknown_var / 2", {...})  # → None (nie crash)
```

### 4. State Management w Dashboard

```typescript
// Global mode (Annual/Quarterly)
const [mode, setMode] = useState<'annual' | 'quarterly'>('annual');

// Tryb Annual:
- selectedYears: [2021, 2022, 2023] (checkboxa)
- selectedQuarters: [] (nie używane)

// Tryb Quarterly:
- selectedYears: [] (nie używane w kalkulacji)
- selectedQuarterYears: [2023, 2022] (dla filtrowania)
- selectedQuarters: ["Q1 2023", "Q2 2023", "Q3 2022"] (do kalkulacji)

// Kalkulacja:
- Annual: quarter = null w request
- Quarterly: quarter = parseInt(selectedQuarters[0].split(' ')[0][1]) (np. "Q1" → 1)
```

### 5. Shift+Click Range Selection

```typescript
const [lastClickedYear, setLastClickedYear] = useState<number | null>(null);
const [lastClickedQuarter, setLastClickedQuarter] = useState<string | null>(null);

const handleYearClick = (year: number, shiftKey: boolean) => {
  if (shiftKey && lastClickedYear !== null) {
    // Shift+Click: zaznacz zakres [lastClickedYear, year]
    const start = Math.min(lastClickedYear, year);
    const end = Math.max(lastClickedYear, year);
    const yearsInRange = YEARS.filter(y => y >= start && y <= end);
    setSelectedYears(prev => [...new Set([...prev, ...yearsInRange])]);
  } else {
    // Normal toggle
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  }
  setLastClickedYear(year);
};

// Użycie:
// 1. Klik 2020
// 2. Trzymaj Shift, klik 2023
// → Zaznacza się 2020, 2021, 2022, 2023
```

---

## Guides Rozszerzeń

### Dodanie Nowego Wskaźnika

#### Krok 1: Definiowanie w Backu (manual lub UI)

**Opcja A: Via API (UI w Indicators)**
```
1. Indicators → "Dodaj wskaźnik"
2. Wpisać:
   - Name: "asset_turnover"
   - Display Name: "Asset Turnover"
   - Formula: "revenue / total_assets"
   - Category: "Efficiency"
   - Is Percentage: 0
   - Description: "How efficiently company uses assets"
```

**Opcja B: Via seed.py (programmatycznie)**
```python
# backend/seed.py
db.add(IndicatorDefinition(
    name="asset_turnover",
    display_name="Asset Turnover",
    formula="revenue / total_assets",
    category="Efficiency",
    is_percentage=0,
    description="Revenue per dollar of assets"
))
db.commit()
```

#### Krok 2: Kalkulacja Automatic

```
1. Dashboard → Wybierz spółkę, lata, wskaźnik "Asset Turnover"
2. Klik "Oblicz"
3. Backend:
   - Pobiera zmienne (revenue, total_assets) z DB
   - Oblicza: revenue / total_assets
   - Zwraca wynik
```

### Dodanie Agregującego Wskaźnika

```python
# backend/seed.py - Example: 3-Year Average ROE

# Najpierw musi być base indicator (ROE)
base_roe = db.query(IndicatorDefinition).filter_by(name="roe").first()

# Tworzy wskaźnik agregujący
db.add(IndicatorDefinition(
    name="roe_3yr_avg",
    display_name="3-Year Average ROE",
    agg_type="mean",      # Średnia
    agg_years=3,          # Z 3 lat
    base_indicator_id=base_roe.id,  # Bazuje na ROE
    category="Profitability",
    is_percentage=1
))
db.commit()

# Obliczanie:
# Dla roku 2023:
# 1. Oblicz ROE dla 2023, 2022, 2021
# 2. Średnia = (ROE_2023 + ROE_2022 + ROE_2021) / 3
```

### Zmiana Formuly Wskaźnika

```
1. Indicators → Klik "Edytuj" przy wskaźniku
2. Zmienić formula (np. z "net_income / equity" na "operating_income / equity")
3. Klik "Zachowaj"
4. Wskaźnik zostanie przeliczony z nową formułą
```

### Dodanie Nowej Zmiennej Finansowej

```
1. Companies → Wybierz spółkę → "Dodaj dane"
2. Excel:
   | Zmienna          | 2023 | 2022 |
   |------------------|------|------|
   | revenue          | 1000 | 950  |
   | operating_income | 200  | 190  |
   | ebitda           | 250  | 240  | ← NOWA

3. Upload file
4. Backend automatycznie upsertuje nowe zmienne
```

### Wsparcie Nowego Typu Agregacji

```python
# backend/routers/indicators.py - POST /calculate

# Dodać w sekcji: elif indicator.agg_type in (...)
elif indicator.agg_type == "stdev":  # Standard Deviation
    agg_years = indicator.agg_years or 5
    values = []
    
    # Zbierz wartości z N lat
    for y in range(year - agg_years + 1, year + 1):
        # ... pobierz wartość z DB ...
        values.append(val)
    
    # Oblicz std dev
    if len(values) >= indicator.agg_years:
        import statistics
        results[year][indicator.display_name] = round(
            statistics.stdev(values), 4
        )
```

### Eksport Wyników do Excel

```typescript
// frontend/src/pages/Dashboard.tsx - dodać guzik

const handleExportResults = () => {
  // 1. Konwertuj results na struktur ę do Excel
  const data = sortedYears.map(year => ({
    Rok: year,
    ...results[year]
  }));
  
  // 2. Utwórz Excel sheet
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  
  // 3. Download
  XLSX.writeFile(wb, "results.xlsx");
};
```

### Obsługa Błędów w Kalkulacjach

```python
# backend/services/calculator.py - Już zaimplementowane

def calculate_indicator(formula: str, variables: dict) -> float | None:
    try:
        result = eval(formula, {"__builtins__": {}}, context)
        return round(float(result), 4)
    
    except ZeroDivisionError:
        # log: f"ZeroDivisionError w {formula}"
        return None
    
    except KeyError as e:
        # log: f"Undefined variable: {e} w {formula}"
        return None
    
    except Exception as e:
        # log: f"Unexpected error: {e} w {formula}"
        return None
```

---

## Troubleshooting

### Backend nie startuje
```bash
# Sprawdzić:
cd backend
python main.py

# Błędy typowe:
# - Missing zmienne środowiskowe: DATABASE_URL
# - Port 8000 już w użyciu
# - Missing dependencies: pip install -r requirements.txt
```

### Frontend nie łączy się z backendem
```bash
# Sprawdzić CORS w main.py:
app.add_middleware(CORSMiddleware, allow_origins=[...])

# Lub ustawić:
export REACT_APP_API_URL=http://localhost:8000/api
npm start
```

### Wskaźnik zwraca None
```
Powody:
1. Brakuje zmiennej w danych finansowych
   - Sprawdzić: GET /api/financials/1 → czy zmienna istnieje?
   
2. Dzielenie przez zero w formule
   - np. "revenue / 0"
   
3. Błąd w składni formuły
   - Testować: calculate_indicator("formula", {"x": 10, "y": 20})
```

---

## Kontakt i Dalszy Rozwój

Aby dodać nową funkcjonalność:
1. Zdefiniuj model danych (jeśli potrzeba) w `models.py`
2. Utwórz router w `routers/` lub rozszerz istniejący
3. Dodaj API client metody w `frontend/src/services/api.ts`
4. Implementuj UI w `frontend/src/pages/` lub `components/`
5. Test end-to-end

Dokumentacja będzie aktualizowana w miarę rozwoju projektu.

---

**Ostatnia aktualizacja:** 2026-06-10
**Wersja:** 1.0.0
**Autor:** Financial Analyzer Team
