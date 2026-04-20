import { useEffect, useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tabs, Tab, Box, Typography, Paper,
  CircularProgress, Chip, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { financialsApi } from '../services/api';

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

interface Period {
  label: string;
  year: number;
  quarter: number | null;
}

export default function FinancialDataDialog({ open, onClose, company, years, mode = 'annual' }: Props) {
  const [tab, setTab] = useState(0);
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [financialData, setFinancialData] = useState<Record<string, Record<string, string>>>({});
  const [newVariable, setNewVariable] = useState('');
  const [newYear, setNewYear] = useState('');
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [variableCategories, setVariableCategories] = useState<Record<string, string>>(getVariableCategories);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editCategoryVar, setEditCategoryVar] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (company?.id) {
      const saved = localStorage.getItem(`extraYears_${company.id}`);
      setExtraYears(saved ? JSON.parse(saved) : []);
    }
  }, [company?.id]);

  const allYears = [...years, ...extraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  const MAX_QUARTERLY_YEARS = 3;
  const displayYears = mode === 'quarterly'
    ? allYears.slice(-MAX_QUARTERLY_YEARS)
    : allYears;

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
    if (variableCategories[variable]) return variableCategories[variable];
    for (const [cat, vars] of Object.entries(DEFAULT_CATEGORIES)) {
      if (vars.includes(variable)) return cat;
    }
    return 'Other';
  };

  const allCategories: string[] = ['all', ...Array.from(new Set(variables.map((v: string) => getCategoryForVariable(v))))];

  const filteredVariables: string[] = categoryFilter === 'all'
    ? [...variables].sort()
    : [...variables].filter((v: string) => getCategoryForVariable(v) === categoryFilter).sort();

  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables((prev: string[]) => [...prev, v]);
      setFinancialData((prev: Record<string, Record<string, string>>) => {
        const updated = { ...prev };
        periods.forEach(p => {
          updated[p.label] = { ...updated[p.label], [v]: '' };
        });
        return updated;
      });
      setNewVariable('');
    }
  };

  const handleAddYear = () => {
    const y = parseInt(newYear);
    if (!isNaN(y) && y > 1900 && y < 2100 && !allYears.includes(y)) {
      const updated = [...extraYears, y];
      setExtraYears(updated);
      if (company?.id) {
        localStorage.setItem(`extraYears_${company.id}`, JSON.stringify(updated));
      }
      setNewYear('');
    }
  };

  const handleDeleteVariable = async (variable: string) => {
  if (!window.confirm(`Usunąć zmienną "${variable}" ze wszystkich spółek i lat? Tej operacji nie można cofnąć.`)) return;
  try {
    console.log('Deleting variable:', JSON.stringify(variable));
    await financialsApi.deleteVariable(encodeURIComponent(variable));
      setVariables((prev: string[]) => prev.filter((v: string) => v !== variable));
      const updated = { ...variableCategories };
      delete updated[variable];
      setVariableCategories(updated);
      saveVariableCategories(updated);
      const updatedDefVars = JSON.parse(localStorage.getItem('defaultVariables') || '[]').filter((v: string) => v !== variable);
      localStorage.setItem('defaultVariables', JSON.stringify(updatedDefVars));
    } catch {
      console.error('Błąd usuwania zmiennej');
    }
  };

  const handleSetCategory = (variable: string, category: string) => {
    const updated = { ...variableCategories, [variable]: category };
    setVariableCategories(updated);
    saveVariableCategories(updated);
    setEditCategoryVar(null);
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    const requests = periods.flatMap(period =>
      variables
        .filter((variable: string) => {
          const val = financialData[period.label]?.[variable];
          return val !== '' && val !== undefined && !isNaN(Number(val));
        })
        .map((variable: string) => financialsApi.upsert({
          company_id: company.id,
          year: period.year,
          quarter: period.quarter,
          variable_name: variable,
          value: parseFloat(financialData[period.label][variable])
        }))
    );
    await Promise.all(requests);
    setSaving(false);
    onClose();
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
                    {/* Filtry kategorii */}
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
                                <Tooltip title="Usuń zmienną ze wszystkich spółek">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteVariable(variable)}
                                  >
                                    <DeleteIcon fontSize="small" />
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
                          label="Dodaj nową zmienną"
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
    </Dialog>
  );
}