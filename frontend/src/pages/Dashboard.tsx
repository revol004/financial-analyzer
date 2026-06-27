import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, OutlinedInput, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, CircularProgress,
  Divider, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Tabs, Tab, Tooltip, Autocomplete,
  Checkbox, FormControlLabel
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { companiesApi, financialsApi, indicatorsApi } from '../services/api';
import IndicatorChart from '../components/IndicatorChart';

// Reprezentuje spółkę giełdową z jej identyfikatorem, nazwą i tickerem
interface Company { id: number; name: string; ticker: string; }

// Reprezentuje wskaźnik finansowy z opcjonalną kategorią i flagą procentową
interface Indicator { id: number; display_name: string; category?: string; is_percentage?: number; }

// Tryb działania dashboardu: roczny lub kwartalny
interface Props { mode: 'annual' | 'quarterly'; }

// Wczytuje dodatkowe lata zapisane przez użytkownika w localStorage
const savedExtraYears: number[] = JSON.parse(localStorage.getItem('dialogExtraYears') || '[]');

// Aktualny rok kalendarzowy
const currentYear = new Date().getFullYear();

// Bazowa lista 20 lat wstecz od bieżącego roku
const baseYears = Array.from({ length: 20 }, (_, i) => currentYear - i);

// Scalona, odfiltrowana i posortowana lista dostępnych lat (bazowe + dodane przez użytkownika)
const YEARS = [...baseYears, ...savedExtraYears]
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort((a, b) => b - a);

// Domyślne zmienne finansowe – wczytywane z localStorage lub ustawiane na standardowy zestaw
const COMMON_VARIABLES = (() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
})();

// Etykiety kwartałów
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];


export default function Dashboard({ mode }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]); // Lista wszystkich spółek z API
  const [indicators, setIndicators] = useState<Indicator[]>([]);  // Lista wszystkich wskaźników z API
  const [groups, setGroups] = useState<any[]>([]);  // Lista wszystkich grup wskaźników
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]); // ID wybranych przez użytkownika spółek
  const [selectedYears, setSelectedYears] = useState<number[]>([]); // Wybrane lata analizy
  const [selectedQuarterYears, setSelectedQuarterYears] = useState<number[]>([]); // Lata dla filtrowania kwartałów
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]); // Wybrane kwartały w trybie kwartalnym
  const [selectedIndicators, setSelectedIndicators] = useState<number[]>([]); // ID wybranych wskaźników
  const [selectedGroup, setSelectedGroup] = useState<number | ''>(''); // Wybrana grupa wskaźników
  const [indicatorTab, setIndicatorTab] = useState<string>('all');  // Aktywna zakładka kategorii wskaźników
  const [lastClickedYear, setLastClickedYear] = useState<number | null>(null); // Ostatnio kliknięty rok (dla Shift+Click)
  const [lastClickedQuarter, setLastClickedQuarter] = useState<string | null>(null); // Ostatnio kliknięty kwartał (dla Shift+Click)
  const [results, setResults] = useState<Record<number, any>>({});  // Obliczone wyniki wskaźników per spółka
  const [loading, setLoading] = useState(false);  // Flaga ładowania podczas obliczeń
  const [tab, setTab] = useState(0);  // Aktywna zakładka roku w dialogu danych
  const [dataDialogOpen, setDataDialogOpen] = useState(false);   // Czy dialog danych finansowych jest otwarty
  const [activeCompany, setActiveCompany] = useState<Company | null>(null); // Spółka aktualnie edytowana w dialogu
  const [financialData, setFinancialData] = useState<Record<number, Record<string, string>>>({}); // Dane finansowe wprowadzane w dialogu (rok → zmienna → wartość)
  const [existingData, setExistingData] = useState<Record<number, any>>({}); // Dane finansowe pobrane z API per spółka
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);  // Aktualny zestaw zmiennych finansowych w dialogu
  const [newVariable, setNewVariable] = useState('');  // Wartość pola tekstowego dla nowej zmiennej
  const [saveAsVarDialogOpen, setSaveAsVarDialogOpen] = useState(false);
  const [varNames, setVarNames] = useState<Record<string, string>>({});
  const [varCategories, setVarCategories] = useState<Record<string, string>>({});;
  const [useExistingVar, setUseExistingVar] = useState<Record<string, boolean>>({}); // Czy użyć istniejącej zmiennej
  const [selectedExistingVar, setSelectedExistingVar] = useState<Record<string, string>>({}); // Która istniejąca zmienna
  const [availableQuartersByCompany, setAvailableQuartersByCompany] = useState<
  Record<number, { year: number; quarter: number }[]>  // Kwartały dostępne w backendzie per spółka
>({});
  const [dialogExtraYears, setDialogExtraYears] = useState<number[]>(() => { // Dodatkowe lata w dialogu (persystowane w localStorage)
    const saved = localStorage.getItem('dialogExtraYears'); 
    return saved ? JSON.parse(saved) : [];
  });
  const [dialogNewYear, setDialogNewYear] = useState('');  // Wartość pola do dodania nowego roku w dialogu
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' }); // Stan powiadomienia (snackbar)

  // Lata dialogu: unikalne, posortowane rosnąco połączenie wybranych lat i dodatkowych
  const dialogYears = [...selectedYears, ...dialogExtraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

    // Wybrane lata posortowane rosnąco (do tabeli wyników)
  const sortedYears = [...selectedYears].sort((a, b) => a - b);

  // Pełne obiekty wybranych wskaźników (do tabeli i wykresu)
  const selectedIndicatorObjects = indicators.filter(i => selectedIndicators.includes(i.id));

  // Pełne obiekty wybranych spółek (do tabeli i wykresu)
  const selectedCompanyObjects = companies.filter(c => selectedCompanies.includes(c.id));

  useEffect(() => {
    companiesApi.getAll().then(r => setCompanies(r.data));
    indicatorsApi.getAll().then(r => setIndicators(r.data));
    indicatorsApi.getGroups().then(r => setGroups(r.data)).catch(() => setGroups([]));
  }, []);

useEffect(() => {
  setSelectedCompanies([]);
  setSelectedYears([]);
  setSelectedQuarterYears([]);
  setSelectedQuarters([]);
  setSelectedGroup('');
  setResults({});
  setExistingData({});
  setLastClickedYear(null);
  setLastClickedQuarter(null);
}, [mode]);



  // Spłaszczona lista dostępnych kwartałów: 5 ostatnich lat × 4 kwartały + kwartały z backendu
// Deduplikowana po etykiecie (np. "Q1 2024")
const backendQuarters = Object.values(availableQuartersByCompany).flat();

const QUARTER_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => currentYear - i)
    .flatMap(year => QUARTERS.map(q => ({
      label: `${q} ${year}`,
      year,
      quarter: parseInt(q[1])
    }))),

  ...backendQuarters.map(q => ({
    label: `Q${q.quarter} ${q.year}`,
    year: q.year,
    quarter: q.quarter
  }))
].filter((v, i, a) =>
  a.findIndex(x => x.label === v.label) === i
);

// Pobiera dane finansowe dla nowo wybranych spółek (jeśli nie są jeszcze w cache)
  const handleCompanyChange = async (companyIds: number[]) => {
  setSelectedCompanies(companyIds);
  setResults({});
  const newExisting: Record<number, any> = {};
  for (const id of companyIds) {
    if (mode === 'annual') {
      const res = await financialsApi.getByCompany(id);
      newExisting[id] = res.data;
    } else {
      // Dla kwartałów pobierz dane ze wszystkich 4 kwartałów
      const quarterData: Record<string, any> = {};
      await Promise.all(
        [1, 2, 3, 4].map(async q => {
          const res = await financialsApi.getByCompany(id, q);
          Object.entries(res.data).forEach(([year, vars]) => {
            const key = `Q${q} ${year}`;
            quarterData[key] = vars;
          });
        })
      );
      newExisting[id] = quarterData;
    }
  }
  setExistingData(newExisting);
  };

  // Obsługuje zmianę wybranej grupy wskaźników
  const handleGroupChange = (groupId: number | '') => {
    setSelectedGroup(groupId);
    if (groupId !== '') {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        setSelectedIndicators(group.indicator_ids);
      }
    }
  };
// a następnie odświeża lokalny cache
  const handleSaveData = async () => {
    if (!activeCompany) return;
    try {
      for (const year of dialogYears) {
        for (const variable of variables) {
          const val = financialData[year]?.[variable];
          if (val !== '' && val !== undefined && !isNaN(Number(val))) {
            await financialsApi.upsert({
              company_id: activeCompany.id,
              year,
              variable_name: variable,
              value: parseFloat(val)
            });
          }
        }
      }
      const res = await financialsApi.getByCompany(activeCompany.id);
      setExistingData(prev => ({ ...prev, [activeCompany.id]: res.data }));
      setSnackbar({ open: true, message: 'Dane zapisane!', severity: 'success' });
      setDataDialogOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Błąd zapisu danych.', severity: 'error' });
    }
  };

  // Importuje dane finansowe z pliku CSV/XLSX i odświeża cache spółki
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, companyId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await financialsApi.import(companyId, file);
      const res = await financialsApi.getByCompany(companyId);
      setExistingData(prev => ({ ...prev, [companyId]: res.data }));
      setSnackbar({ open: true, message: 'Import zakończony sukcesem!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Błąd importu pliku.', severity: 'error' });
    }
  };

  // Oblicza wskaźniki dla wybranych spółek, lat lub kwartałów i zapisuje wyniki w stanie
  const handleCalculate = async () => {
    const hasYears = mode === 'annual' ? selectedYears.length > 0 : selectedQuarters.length > 0;
    if (selectedCompanies.length === 0 || !hasYears || selectedIndicators.length === 0) return;
    setLoading(true);
    try {
      const newResults: Record<number, any> = {};
      for (const companyId of selectedCompanies) {
        if (mode === 'annual') {
          const res = await indicatorsApi.calculate({
            company_id: companyId,
            indicator_ids: selectedIndicators,
            years: selectedYears.sort()
          });
          newResults[companyId] = res.data;
        } else {
          const quarterResults: Record<string, any> = {};
          for (const q of selectedQuarters) {
            const opt = QUARTER_OPTIONS.find(o => o.label === q);
            if (!opt) continue;
            const res = await indicatorsApi.calculate({
              company_id: companyId,
              indicator_ids: selectedIndicators,
              years: [opt.year],
              quarter: opt.quarter
            });
            const key = `${opt.year}-Q${opt.quarter}`;
quarterResults[key] = res.data[opt.year];
          }
          newResults[companyId] = quarterResults;
        }
      }
      setResults(newResults);
    } catch {
      setSnackbar({ open: true, message: 'Błąd obliczania wskaźników.', severity: 'error' });
    }
    setLoading(false);
  };


  // Eksportuje wyniki do pliku Excel (.xlsx) z nazwą opartą na tickerach spółek
  const handleExportExcel = () => {
    if (Object.keys(results).length === 0) return;
    const rows: any[] = [];
    selectedIndicatorObjects.forEach(ind => {
      const row: any = { 'Wskaźnik': ind.display_name };
      sortedYears.forEach((y: number) => {
        selectedCompanyObjects.forEach(company => {
          const val = results[company.id]?.[y]?.[ind.display_name];
          row[`${company.ticker} ${y}`] = val !== null && val !== undefined
            ? ind.is_percentage
              ? parseFloat((val * 100).toFixed(2))
              : parseFloat(val.toFixed(4))
            : 'N/A';
        });
      });
      rows.push(row);
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wskaźniki');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const tickers = selectedCompanyObjects.map(c => c.ticker).join('_');
    saveAs(blob, `${tickers}_wskazniki.xlsx`);
  };

// Dodaje nową zmienną finansową do listy (normalizuje nazwę do snake_case)
  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      const updated = [...variables, v];
      setVariables(updated);
      // Zapisz w localStorage
      localStorage.setItem('defaultVariables', JSON.stringify(updated));
      setNewVariable('');
    }
  };

  // Obsługuje klik na rok z obsługą Shift+Click do zaznaczania zakresu
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedYear !== null) {
      // Shift+Click: zaznacz zakres od lastClickedYear do year
      const start = Math.min(lastClickedYear, year);
      const end = Math.max(lastClickedYear, year);
      const yearsInRange = YEARS.filter(y => y >= start && y <= end);
      const newSelected = Array.from(new Set([...selectedYears, ...yearsInRange]));
      setSelectedYears(newSelected);
    } else {
      // Normal toggle
      setSelectedYears(prev => 
        prev.includes(year) 
          ? prev.filter(y => y !== year)
          : [...prev, year]
      );
    }
    setLastClickedYear(year);
  };

  const handleQuarterClick = (quarterLabel: string, shiftKey: boolean) => {
    if (shiftKey && lastClickedQuarter !== null) {
      // Shift+Click: zaznacz zakres od lastClickedQuarter do quarterLabel
      const filteredQuarters = QUARTER_OPTIONS
        .filter(q => selectedQuarterYears.includes(q.year))
        .sort((a, b) => b.year - a.year || a.quarter - b.quarter)
        .map(q => q.label);
      
      const startIndex = filteredQuarters.indexOf(lastClickedQuarter);
      const endIndex = filteredQuarters.indexOf(quarterLabel);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const min = Math.min(startIndex, endIndex);
        const max = Math.max(startIndex, endIndex);
        const quartersInRange = filteredQuarters.slice(min, max + 1);
        const newSelected = Array.from(new Set([...selectedQuarters, ...quartersInRange]));
        setSelectedQuarters(newSelected);
      }
    } else {
      // Normal toggle
      setSelectedQuarters(prev => 
        prev.includes(quarterLabel) 
          ? prev.filter(q => q !== quarterLabel)
          : [...prev, quarterLabel]
      );
    }
    setLastClickedQuarter(quarterLabel);
  };

  // Zaznacza wszystkie dostępne lata
  const handleSelectAllYears = () => {
    setSelectedYears([...YEARS]);
  };

  // Odznacza wszystkie lata
  const handleDeselectAllYears = () => {
    setSelectedYears([]);
  };

// Dodaje nowy rok do dialogu i persystuje go w localStorage
  const handleAddDialogYear = () => {
    const y = parseInt(dialogNewYear);
    if (!isNaN(y) && y > 1900 && y < 2100 && !dialogYears.includes(y)) {
      const updated = [...dialogExtraYears, y];
      setDialogExtraYears(updated);
      localStorage.setItem('dialogExtraYears', JSON.stringify(updated));
      setDialogNewYear('');
    }
  };
const handleSaveIndicatorsToData = async (
  companyId: number, 
  customNames: Record<string, string>, 
  customCategories?: Record<string, string>,
  useExisting?: Record<string, boolean>,
  selectedExisting?: Record<string, string>
) => {
  try {
    for (const year of selectedYears) {
      for (const ind of selectedIndicatorObjects) {
        const val = results[companyId]?.[year]?.[ind.display_name];
        if (val !== null && val !== undefined) {
          // Określ nazwę zmiennej: użyj istniejącej lub nowej
          let finalVarName = customNames[ind.display_name] || ind.display_name.toLowerCase().replace(/\s+/g, '_');
          if (useExisting?.[ind.display_name] && selectedExisting?.[ind.display_name]) {
            finalVarName = selectedExisting[ind.display_name];
          }
          
          const payload: any = {
            company_id: companyId,
            year,
            variable_name: finalVarName,
            value: val
          };
          // Dodaj kategorię jeśli została podana
          if (customCategories?.[ind.display_name]) {
            payload.category = customCategories[ind.display_name];
          }
          await financialsApi.upsert(payload);
        }
      }
    }
    setSnackbar({ open: true, message: 'Wskaźniki zapisane do danych!', severity: 'success' });
    setSaveAsVarDialogOpen(false);
  } catch {
    setSnackbar({ open: true, message: 'Błąd zapisu wskaźników.', severity: 'error' });
  }
};
// Tablica okresów do nagłówków tabeli: lata (roczne) lub kwartały (kwartalne)
const periods =
  mode === 'annual'
    ? selectedYears.map(y => ({
        label: String(y),
        key: y
      }))
    : selectedQuarters.map(q => {
        const opt = QUARTER_OPTIONS.find(o => o.label === q);
        return opt
          ? {
              label: q,
              key: `${opt.year}-Q${opt.quarter}`
            }
          : { label: q, key: q };
      });

 

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Kalkulator wskaźników
      </Typography>

      {/* 1. Wybór spółek */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>1. Wybierz spółki</Typography>
        <FormControl fullWidth>
          <InputLabel>Spółki</InputLabel>
          <Select
            multiple
            value={selectedCompanies}
            onChange={(e) => handleCompanyChange(e.target.value as number[])}
            input={<OutlinedInput label="Spółki" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {companies
                  .filter(c => (selected as number[]).includes(c.id))
                  .map(c => (
                    <Chip
                      key={c.id}
                      label={c.ticker}
                      size="small"
                      color="primary"
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleCompanyChange(selectedCompanies.filter(id => id !== c.id));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ))}
              </Box>
            )}
          >
            {companies.map(c => (
              <MenuItem key={c.id} value={c.id} sx={{
                backgroundColor: selectedCompanies.includes(c.id) ? '#1976d2 !important' : 'inherit',
                color: selectedCompanies.includes(c.id) ? 'white !important' : 'inherit',
                '&.Mui-selected': { backgroundColor: '#1976d2 !important', color: 'white !important' },
                '&.Mui-selected:hover': { backgroundColor: '#1565c0 !important' },
              }}>
                <strong>{c.ticker}</strong>&nbsp;– {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedCompanyObjects.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedCompanyObjects.map(company => (
              <Box key={company.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="bold">{company.ticker}:</Typography>
                <Tooltip title="Importuj z CSV/Excel">
                  <Button variant="outlined" size="small" startIcon={<UploadIcon />} component="label">
                    Import
                    <input type="file" hidden accept=".csv,.xlsx" onChange={(e) => handleImport(e, company.id)} />
                  </Button>
                </Tooltip>
                {existingData[company.id] && Object.keys(existingData[company.id]).length > 0 ? (
                  <Chip label={`dane: ${Object.keys(existingData[company.id]).sort().join(', ')}`} size="small" color="success" />
                ) : (
                  <Chip label="brak danych" size="small" color="warning" />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* 2. Wybierz lata / kwartały */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Wybierz {mode === 'annual' ? 'lata' : 'kwartały'}
        </Typography>
        {mode === 'annual' ? (
          <Box>
            {/* Przyciski szybkiego wyboru */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleSelectAllYears}
              >
                Zaznacz wszystko
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleDeselectAllYears}
              >
                Odznacz wszystko
              </Button>
            </Box>

            {/* Wyświetlone zaznaczone lata */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {selectedYears.sort((a, b) => b - a).map(y => (
                <Chip
                  key={y}
                  label={y}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedYears(selectedYears.filter(year => year !== y))}
                />
              ))}
            </Box>

            {/* Grid z checkboxami dla lat */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: '1px solid #e0e0e0'
            }}>
              {YEARS.map(y => (
                <FormControlLabel
                  key={y}
                  control={
                    <Checkbox
                      checked={selectedYears.includes(y)}
                      onChange={(e) => {
                        handleYearClick(y, (e.nativeEvent as KeyboardEvent).shiftKey);
                      }}
                    />
                  }
                  label={y.toString()}
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
              ))}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              💡 Wskazówka: Kliknij rok, trzymaj Shift i kliknij inny rok, aby zaznaczyć zakres
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* 2a. Wybierz lata dla kwartałów */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              2a. Wybierz lata dla kwartałów
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setSelectedQuarterYears([...baseYears])}
              >
                Zaznacz wszystko
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setSelectedQuarterYears([])}
              >
                Odznacz wszystko
              </Button>
            </Box>

            {/* Wyświetlone zaznaczone lata dla kwartałów */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {selectedQuarterYears.sort((a, b) => b - a).map(y => (
                <Chip
                  key={y}
                  label={y}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedQuarterYears(selectedQuarterYears.filter(year => year !== y))}
                />
              ))}
            </Box>

            {/* Grid z checkboxami dla lat */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: '1px solid #e0e0e0',
              mb: 3
            }}>
              {baseYears.map(y => (
                <FormControlLabel
                  key={y}
                  control={
                    <Checkbox
                      checked={selectedQuarterYears.includes(y)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuarterYears([...selectedQuarterYears, y].sort((a, b) => b - a));
                        } else {
                          setSelectedQuarterYears(selectedQuarterYears.filter(year => year !== y));
                        }
                      }}
                    />
                  }
                  label={y.toString()}
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
              ))}
            </Box>

            {/* 2b. Wybierz kwartały */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              2b. Wybierz kwartały {selectedQuarterYears.length > 0 ? `(z lat: ${selectedQuarterYears.sort((a,b) => b - a).join(', ')})` : '(najpierw wybierz lata)'}
            </Typography>

            {selectedQuarterYears.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                ℹ️ Wybierz najpierw lata powyżej, aby zobaczyć dostępne kwartały
              </Typography>
            ) : (
              <>
                {/* Przyciski szybkiego wyboru */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      const allQuarters = QUARTER_OPTIONS
                        .filter(q => selectedQuarterYears.includes(q.year))
                        .map(q => q.label);
                      setSelectedQuarters(allQuarters);
                    }}
                  >
                    Zaznacz wszystko
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => setSelectedQuarters([])}
                  >
                    Odznacz wszystko
                  </Button>
                </Box>

                {/* Wyświetlone zaznaczone kwartały */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {selectedQuarters.map(q => (
                    <Chip
                      key={q}
                      label={q}
                      size="small"
                      color="primary"
                      onDelete={() => setSelectedQuarters(selectedQuarters.filter(sq => sq !== q))}
                    />
                  ))}
                </Box>

                {/* Grid z checkboxami dla kwartałów */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: 1,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0'
                }}>
                  {QUARTER_OPTIONS
                    .filter(q => selectedQuarterYears.includes(q.year))
                    .sort((a, b) => b.year - a.year || a.quarter - b.quarter)
                    .map(q => (
                      <FormControlLabel
                        key={q.label}
                        control={
                          <Checkbox
                            checked={selectedQuarters.includes(q.label)}
                            onChange={(e) => {
                              handleQuarterClick(q.label, (e.nativeEvent as KeyboardEvent).shiftKey);
                            }}
                          />
                        }
                        label={q.label}
                        sx={{ m: 0, whiteSpace: 'nowrap' }}
                      />
                    ))}
                </Box>

                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                  💡 Wskazówka: Kliknij kwartał, trzymaj Shift i kliknij inny kwartał, aby zaznaczyć zakres
                </Typography>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* 3. Wybierz wskaźniki */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>3. Wybierz wskaźniki</Typography>
        
        {groups.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Grupy wskaźników (opcjonalnie)</InputLabel>
              <Select
                value={selectedGroup}
                label="Grupy wskaźników (opcjonalnie)"
                onChange={(e) => handleGroupChange(e.target.value as number | '')}
              >
                <MenuItem value="">Brak grupy</MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name} ({group.indicator_ids?.length || 0} wskaźników)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedGroup !== '' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                ℹ️ Grupa automatycznie zaznaczyła wybrane wskaźniki. Możesz dodać lub usunąć wskaźniki ręcznie.
              </Typography>
            )}
          </Box>
        )}

        <Tabs
          value={indicatorTab}
          onChange={(_, v) => setIndicatorTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All" value="all" />
          {Array.from(new Set(indicators.map(i => i.category || 'Other'))).map(cat => (
            <Tab key={cat} label={cat} value={cat} />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {indicators
  .filter(i => indicatorTab === 'all' || (i.category || 'Other') === indicatorTab)
  .sort((a, b) => a.display_name.localeCompare(b.display_name))
  .map(i => (
              <Chip
                key={i.id}
                label={i.display_name}
                onClick={() => {
                  setSelectedGroup('');  // Clear group selection when manually selecting indicators
                  if (selectedIndicators.includes(i.id)) {
                    setSelectedIndicators(selectedIndicators.filter(id => id !== i.id));
                  } else {
                    setSelectedIndicators([...selectedIndicators, i.id]);
                  }
                }}
                color={selectedIndicators.includes(i.id) ? 'primary' : 'default'}
                variant={selectedIndicators.includes(i.id) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
        </Box>
        {selectedIndicators.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
              Wybrane:
            </Typography>
            {indicators
              .filter(i => selectedIndicators.includes(i.id))
              .map(i => (
                <Chip
                  key={i.id}
                  label={i.display_name}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedIndicators(selectedIndicators.filter(id => id !== i.id))}
                />
              ))}
          </Box>
        )}
      </Paper>

      {/* Przyciski */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
          onClick={handleCalculate}
          disabled={selectedCompanies.length === 0 || (mode === 'annual' ? selectedYears.length === 0 : selectedQuarters.length === 0) || selectedIndicators.length === 0 || loading}
          sx={{ px: 4, py: 1.5 }}
        >
          {loading ? 'Obliczanie...' : 'Oblicz wskaźniki'}
        </Button>

        {Object.keys(results).length > 0 && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            sx={{ px: 4, py: 1.5 }}
          >
            Eksportuj do Excel
          </Button>
        )}

        {Object.keys(results).length > 0 && selectedCompanies.length === 1 && (
  <Button
    variant="contained"
    color="success"
    size="large"
    startIcon={<UploadIcon />}
    onClick={() => {
      const init: Record<string, string> = {};
      const initExisting: Record<string, boolean> = {};
      const initSelectedVar: Record<string, string> = {};
      selectedIndicatorObjects.forEach(ind => {
        init[ind.display_name] = ind.display_name.toLowerCase().replace(/\s+/g, '_');
        initExisting[ind.display_name] = false;
        initSelectedVar[ind.display_name] = '';
      });
      setVarNames(init);
      setVarCategories({});
      setUseExistingVar(initExisting);
      setSelectedExistingVar(initSelectedVar);
      setSaveAsVarDialogOpen(true);
    }}
    sx={{ px: 4, py: 1.5 }}
  >
    Zapisz jako dane
  </Button>
)}
      </Box>

 

      {/* Tabela wyników */}
      {Object.keys(results).length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Wyniki porównawcze</Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#1565c0' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wskaźnik</TableCell>
                  {periods.map(period =>
                    selectedCompanyObjects.map(company => (
                      <TableCell key={`${company.id}-${period}`} sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                        {company.ticker} {period.label}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedIndicatorObjects.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell><strong>{ind.display_name}</strong></TableCell>
                    {periods.map(period =>
                      selectedCompanyObjects.map(company => {
                        const val = results[company.id]?.[period.key]?.[ind.display_name];
                        return (
                          <TableCell key={`${company.id}-${period.key}`} align="right">
                            {val === null || val === undefined ? (
                              <Chip label="brak" size="small" color="warning" />
                            ) : ind.is_percentage ? (
                              <strong>{(val * 100).toFixed(2)}%</strong>
                            ) : (
                              <strong>{val.toFixed(4)}</strong>
                            )}
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
     



      {/* Wykres */}
      {Object.keys(results).length > 0 && mode === 'annual' && (
        <IndicatorChart
          results={results}
          indicators={selectedIndicatorObjects}
          years={selectedYears}
          companies={selectedCompanyObjects}
        />
      )}

      {/* Dialog danych finansowych */}
      <Dialog open={dataDialogOpen} onClose={() => setDataDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Dane finansowe – {activeCompany?.name}
          <Typography variant="body2" color="text.secondary">
            Wartości w tysiącach PLN (zachowaj spójność jednostek)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 2 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {dialogYears.map((y, i) => <Tab key={y} label={y} value={i} />)}
          </Tabs>
          {dialogYears.map((year, i) => (
            <Box key={year} hidden={tab !== i}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Zmienna</strong></TableCell>
                      <TableCell><strong>Wartość</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variables.map(variable => (
                      <TableRow key={variable} hover>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{variable}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={financialData[year]?.[variable] || ''}
                            onChange={(e) => setFinancialData(prev => ({
                              ...prev,
                              [year]: { ...prev[year], [variable]: e.target.value }
                            }))}
                            placeholder="np. 1500000"
                            sx={{ width: 200 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Dodaj zmienną"
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    placeholder="np. ebitda"
                    onKeyDown={(e) => e.key === 'Enter' && addVariable()}
                  />
                  <Button startIcon={<AddIcon />} onClick={addVariable} variant="outlined">
                    Dodaj
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Dodaj rok"
                    value={dialogNewYear}
                    onChange={(e) => setDialogNewYear(e.target.value)}
                    placeholder="np. 2019"
                    type="number"
                    sx={{ width: 120 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDialogYear()}
                  />
                  <Button startIcon={<AddIcon />} onClick={handleAddDialogYear} variant="outlined">
                    Dodaj rok
                  </Button>
                </Box>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDataDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleSaveData}>Zapisz dane</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

<Dialog open={saveAsVarDialogOpen} onClose={() => setSaveAsVarDialogOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>Zapisz wskaźniki jako zmienne</DialogTitle>
  <DialogContent sx={{ pt: '16px !important' }}>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Możesz zmienić nazwy zmiennych pod którymi zostaną zapisane wskaźniki i przypisać je do kategorii.
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
      Opcja „Zmienna już istnieje" pozwala na dopisanie obliczeń do istniejącej zmiennej zamiast tworzenia nowej.
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
          <TableCell><strong>Wskaźnik</strong></TableCell>
          <TableCell align="center"><strong>Istnieje?</strong></TableCell>
          <TableCell><strong>Nazwa zmiennej</strong></TableCell>
          <TableCell><strong>Kategoria (opcj.)</strong></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {selectedCompanyObjects.length > 0 && selectedIndicatorObjects.map(ind => {
  const companyId = selectedCompanyObjects[0].id;
          
          // Załaduj zmienne domyślne z localStorage
          const defaultVars = JSON.parse(localStorage.getItem('defaultVariables') || '[]');
          
          // Utwórz listę ze zmiennych z backendu i zmiennych domyślnych
          const existingVars = {
            ...defaultVars.reduce((acc: Record<string, any>, v: string) => {
              acc[v] = true;
              return acc;
            }, {}),
            ...Object.keys(existingData[companyId] || {})
              .reduce((acc: Record<string, any>, year) => {
                Object.keys((existingData[companyId] || {})[year] || {}).forEach(v => {
                  if (!acc[v]) acc[v] = true;
                });
                return acc;
              }, {})
          };
          
          return (
            <TableRow key={ind.id}>
              <TableCell>{ind.display_name}</TableCell>
              <TableCell align="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useExistingVar[ind.display_name] || false}
                      onChange={(e) => {
                        setUseExistingVar(prev => ({
                          ...prev,
                          [ind.display_name]: e.target.checked
                        }));
                        if (e.target.checked && !selectedExistingVar[ind.display_name]) {
                          setSelectedExistingVar(prev => ({
                            ...prev,
                            [ind.display_name]: Object.keys(existingVars)[0] || ''
                          }));
                        }
                      }}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </TableCell>
              <TableCell>
                {useExistingVar[ind.display_name] ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={selectedExistingVar[ind.display_name] || ''}
                      onChange={(e) => setSelectedExistingVar(prev => ({
                        ...prev,
                        [ind.display_name]: e.target.value
                      }))}
                      sx={{ width: '100%' }}
                    >
                      {Object.keys(existingVars)
                        .sort()
                        .map(varName => (
                          <MenuItem key={varName} value={varName}>
                            {varName}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    size="small"
                    value={varNames[ind.display_name] || ''}
                    onChange={(e) => setVarNames(prev => ({
                      ...prev,
                      [ind.display_name]: e.target.value.toLowerCase().replace(/\s+/g, '_')
                    }))}
                    sx={{ width: '100%' }}
                  />
                )}
              </TableCell>
              <TableCell>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={Array.from(new Set(indicators.map(i => i.category).filter(Boolean)))}
                  value={varCategories[ind.display_name] || ''}
                  onChange={(_, value) => setVarCategories(prev => ({
                    ...prev,
                    [ind.display_name]: value || ''
                  }))}
                  onInputChange={(_, value) => setVarCategories(prev => ({
                    ...prev,
                    [ind.display_name]: value
                  }))}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Np. Profitability" size="small" />
                  )}
                  sx={{ width: '100%' }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setSaveAsVarDialogOpen(false)}>Anuluj</Button>
    <Button
      variant="contained"
      color="success"
      onClick={() => handleSaveIndicatorsToData(selectedCompanyObjects[0].id, varNames, varCategories, useExistingVar, selectedExistingVar)}
    >
      Zapisz
    </Button>
  </DialogActions>
</Dialog>
      
    </Box>
  );
}