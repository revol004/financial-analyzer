import { useEffect, useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tabs, Tab, Box, Typography, Paper,
  CircularProgress, Chip, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { financialsApi } from '../services/api';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

interface Props {
  open: boolean;
  onClose: () => void;
  company: { id: number; name: string } | null;
  years: number[];
  mode?: 'annual' | 'quarterly';
}

const COMMON_VARIABLES = (() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
})();

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  'Income Statement': ['revenue', 'net_income', 'operating_income', 'gross_profit', 'ebitda'],
  'Balance Sheet': ['total_assets', 'current_assets', 'equity', 'total_liabilities', 'current_liabilities', 'longterm_debt'],
  'Cash Flow': ['operating_cash_flow', 'capex', 'free_cash_flow'],
};

const getVariableCategories = (): Record<string, string> => {
  const saved = localStorage.getItem('variableCategories');
  return saved ? JSON.parse(saved) : {};
};

const saveVariableCategories = (cats: Record<string, string>) => {
  localStorage.setItem('variableCategories', JSON.stringify(cats));
};

const getCustomCategories = (): string[] => {
  const saved = localStorage.getItem('customVariableCategories');
  return saved ? JSON.parse(saved) : [];
};

const saveCustomCategories = (cats: string[]) => {
  localStorage.setItem('customVariableCategories', JSON.stringify(cats));
};

interface Period {
  label: string;
  year: number;
  quarter: number | null;
}

export default function FinancialDataDialog({ open, onClose, company, years, mode = 'annual' }: Props) {
  const [tab, setTab] = useState(0);
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [financialData, setFinancialData] = useState<Record<string, Record<string, string>>>({});
  const [newYear, setNewYear] = useState('');
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editCategoryVar, setEditCategoryVar] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryForAdd, setNewCategoryForAdd] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(getCustomCategories);

  useEffect(() => {
    if (company?.id) {
      const saved = localStorage.getItem(`extraYears_${company.id}`);
      const globalYears = JSON.parse(localStorage.getItem('globalExtraYears') || '[]');
      const companyYears = saved ? JSON.parse(saved) : [];
      const merged = [...companyYears, ...globalYears].filter((v, i, a) => a.indexOf(v) === i);
      setExtraYears(merged);
    }
  }, [company?.id]);

  const allYears = [...years, ...extraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  const displayYears = allYears;

  const periods: Period[] = useMemo(() => {
    return mode === 'annual'
      ? displayYears.map(y => ({ label: y.toString(), year: y, quarter: null }))
      : displayYears.flatMap(y =>
          QUARTERS.map((q, qi) => ({ label: `${q} ${y}`, year: y, quarter: qi + 1 }))
        );
  }, [mode, JSON.stringify(displayYears)]);

  useEffect(() => {
    if (open && company) {
      const fetchData = async () => {
        setLoadingData(true);
        const init: Record<string, Record<string, string>> = {};
        const allVars = new Set<string>(COMMON_VARIABLES);

        if (mode === 'annual') {
          const res = await financialsApi.getByCompany(company.id);
          Object.values(res.data).forEach((yearData: any) => {
            Object.keys(yearData).forEach((v: string) => allVars.add(v));
          });
          
          const yearsFromDB = Object.keys(res.data).map(Number);
          const missingYears = yearsFromDB.filter(y => !allYears.includes(y));
          if (missingYears.length > 0 && company?.id) {
            const updatedExtra = [...extraYears, ...missingYears].filter((v, i, a) => a.indexOf(v) === i);
            setExtraYears(updatedExtra);
            localStorage.setItem(`extraYears_${company.id}`, JSON.stringify(updatedExtra));
          }

          setVariables(Array.from(allVars));
          periods.forEach(period => {
            init[period.label] = {};
            allVars.forEach(v => {
              init[period.label][v] = res.data[period.year]?.[v]?.toString() || '';
            });
          });
        } else {
          const quarterData: Record<number, any> = {};
          await Promise.all(
            [1, 2, 3, 4].map(async q => {
              const res = await financialsApi.getByCompany(company.id, q);
              quarterData[q] = res.data;
              Object.values(res.data).forEach((yearData: any) => {
                Object.keys(yearData).forEach((v: string) => allVars.add(v));
              });
            })
          );
          setVariables(Array.from(allVars));
          periods.forEach(period => {
            init[period.label] = {};
            allVars.forEach(v => {
              init[period.label][v] = period.quarter !== null
                ? quarterData[period.quarter]?.[period.year]?.[v]?.toString() || ''
                : '';
            });
          });
        }

        setFinancialData(init);
        setLoadingData(false);
      };
      fetchData();
    }
  }, [open, company, mode]);

  const getCategoryForVariable = (variable: string): string => {
    const variableCategories = getVariableCategories();
    if (variableCategories[variable]) return variableCategories[variable];
    for (const [cat, vars] of Object.entries(DEFAULT_CATEGORIES)) {
      if (vars.includes(variable)) return cat;
    }
    return 'Other';
  };

  const allCategories: string[] = ['all', ...Array.from(new Set([...variables.map((v: string) => getCategoryForVariable(v)), ...customCategories]))];

  const filteredVariables: string[] = categoryFilter === 'all'
    ? [...variables].sort()
    : [...variables].filter((v: string) => getCategoryForVariable(v) === categoryFilter).sort();

  const handleAddYear = () => {
    const y = parseInt(newYear);
    if (!isNaN(y) && y > 1900 && y < 2100 && !allYears.includes(y)) {
      const updated = [...extraYears, y];
      setExtraYears(updated);
      const globalYears = JSON.parse(localStorage.getItem('globalExtraYears') || '[]');
      const updatedGlobal = [...globalYears, y].filter((v, i, a) => a.indexOf(v) === i);
      localStorage.setItem('globalExtraYears', JSON.stringify(updatedGlobal));
      if (company?.id) {
        localStorage.setItem(`extraYears_${company.id}`, JSON.stringify(updated));
      }
      setNewYear('');
    }
  };

 const handleClearVariableValues = (variable: string) => {
  if (!window.confirm(`Wyczyścić wartości zmiennej "${variable}" we wszystkich okresach?`)) return;

  setFinancialData((prev: Record<string, Record<string, string>>) => {
    const updated = { ...prev };

    Object.keys(updated).forEach((period) => {
      if (updated[period]?.[variable] !== undefined) {
        // Ustawiamy od razu 0, skoro baza tego oczekuje
        updated[period] = {
          ...updated[period],
          [variable]: '0'
        };
      }
    });

    return updated;
  });
};

  const handleSetCategory = (variable: string, category: string) => {
    const updated = { ...getVariableCategories(), [variable]: category };
    saveVariableCategories(updated);
    setEditCategoryVar(null);
  };

  const handleAddCategory = () => {
    const categoryName = newCategoryForAdd.trim();
    if (!categoryName) return;
    const allCategories = Array.from(new Set(variables.map((v: string) => getCategoryForVariable(v))));
    if (allCategories.includes(categoryName)) {
      alert('Kategoria już istnieje!');
      return;
    }
    const updated = [...customCategories, categoryName].filter((v, i, a) => a.indexOf(v) === i);
    setCustomCategories(updated);
    saveCustomCategories(updated);
    setCategoryDialogOpen(false);
    setNewCategoryForAdd('');
  };

  const handleSave = async () => {
  if (!company) return;
  setSaving(true);
  
  const requests = periods.flatMap(period =>
    variables.map((variable: string) => {
      const val = financialData[period.label]?.[variable];
      
      // Zamiast null, puste pola zamieniamy na 0
      const finalValue = (val === '' || val === undefined || isNaN(Number(val))) 
        ? 0 
        : parseFloat(val);

      return financialsApi.upsert({
        company_id: company.id,
        year: period.year,
        quarter: period.quarter,
        variable_name: variable,
        value: finalValue
      });
    })
  );
  
  try {
    await Promise.all(requests);
    setSaving(false);
    onClose();
  } catch (error) {
    console.error("Błąd podczas zapisu z wartością 0:", error);
    alert("Wersja z zerem (0) również została odrzucona przez serwer.");
    setSaving(false);
  }
};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Dane finansowe – {company?.name}
        <Typography variant="body2" color="text.secondary">
          {mode === 'annual' ? 'Dane roczne' : 'Dane kwartalne'} – wartości w tysiącach PLN
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loadingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }} color="text.secondary">
              Ładowanie danych...
            </Typography>
          </Box>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ mb: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {periods.map((p, i) => <Tab key={p.label} label={p.label} value={i} />)}
            </Tabs>

            {periods.map((period, i) => (
              <Box key={period.label} hidden={tab !== i}>
                {tab === i && (
                  <>
                    <Tabs
                      value={categoryFilter}
                      onChange={(_, v) => setCategoryFilter(v as string)}
                      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      {allCategories.map((cat: string) => (
                        <Tab key={cat} label={cat === 'all' ? 'Wszystkie' : cat} value={cat} />
                      ))}
                    </Tabs>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Zmienna</strong></TableCell>
                            <TableCell><strong>Kategoria</strong></TableCell>
                            <TableCell><strong>Wartość</strong></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredVariables.map((variable: string) => (
                            <TableRow key={variable} hover>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{variable}</TableCell>
                              <TableCell>
                                {editCategoryVar === variable ? (
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                      size="small"
                                      value={newCategoryName}
                                      onChange={(e) => setNewCategoryName(e.target.value)}
                                      placeholder="np. Balance Sheet"
                                      sx={{ width: 150 }}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSetCategory(variable, newCategoryName)}
                                      autoFocus
                                    />
                                    <Button size="small" onClick={() => handleSetCategory(variable, newCategoryName)}>OK</Button>
                                    <Button size="small" onClick={() => setEditCategoryVar(null)}>✕</Button>
                                  </Box>
                                ) : (
                                  <Chip
                                    label={getCategoryForVariable(variable)}
                                    size="small"
                                    onClick={() => {
                                      setEditCategoryVar(variable);
                                      setNewCategoryName(getCategoryForVariable(variable));
                                    }}
                                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={financialData[period.label]?.[variable] || ''}
                                  onChange={(e) => setFinancialData((prev: Record<string, Record<string, string>>) => ({
                                    ...prev,
                                    [period.label]: { ...prev[period.label], [variable]: e.target.value }
                                  }))}
                                  placeholder="np. 1500000"
                                  sx={{ width: 200 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Wyczyść wartości zmiennej">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleClearVariableValues(variable)}
                                  >
                                    <CleaningServicesIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
                          label="Dodaj rok"
                          value={newYear}
                          onChange={(e) => setNewYear(e.target.value)}
                          placeholder="np. 2019"
                          type="number"
                          sx={{ width: 120 }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddYear()}
                        />
                        <Button startIcon={<AddIcon />} onClick={handleAddYear} variant="outlined">
                          Dodaj rok
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button startIcon={<AddIcon />} onClick={() => setCategoryDialogOpen(true)} variant="outlined">
                          Dodaj kategorię
                        </Button>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Anuluj</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Zapisywanie...' : 'Zapisz dane'}
        </Button>
      </DialogActions>

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Dodaj nową kategorię</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Nazwa kategorii (np. Cash Flow, EBITDA)"
            value={newCategoryForAdd}
            onChange={(e) => setNewCategoryForAdd(e.target.value)}
            fullWidth
            placeholder="np. Operating Metrics"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCategoryDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleAddCategory} disabled={!newCategoryForAdd.trim()}>
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}