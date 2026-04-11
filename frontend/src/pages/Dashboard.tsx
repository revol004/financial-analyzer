import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, OutlinedInput, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, CircularProgress,
  Divider, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Tabs, Tab, Tooltip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { companiesApi, financialsApi, indicatorsApi } from '../services/api';
import IndicatorChart from '../components/IndicatorChart';

interface Company { id: number; name: string; ticker: string; }
interface Indicator { id: number; display_name: string; category?: string; is_percentage?: number; }
interface Props { mode: 'annual' | 'quarterly'; }

const savedExtraYears: number[] = JSON.parse(localStorage.getItem('dialogExtraYears') || '[]');
const currentYear = new Date().getFullYear();
const baseYears = Array.from({ length: 20 }, (_, i) => currentYear - i);
const YEARS = [...baseYears, ...savedExtraYears]
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort((a, b) => b - a);

const COMMON_VARIABLES = (() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
})();

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_OPTIONS = Array.from({ length: 20 }, (_, i) => currentYear - i)
  .flatMap(year => QUARTERS.map(q => ({ label: `${q} ${year}`, year, quarter: parseInt(q[1]) })));

export default function Dashboard({ mode }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([2024, 2023, 2022]);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<number[]>([]);
  const [indicatorTab, setIndicatorTab] = useState<string>('all');
  const [results, setResults] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [financialData, setFinancialData] = useState<Record<number, Record<string, string>>>({});
  const [existingData, setExistingData] = useState<Record<number, any>>({});
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [newVariable, setNewVariable] = useState('');
  const [dialogExtraYears, setDialogExtraYears] = useState<number[]>(() => {
    const saved = localStorage.getItem('dialogExtraYears');
    return saved ? JSON.parse(saved) : [];
  });
  const [dialogNewYear, setDialogNewYear] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const dialogYears = [...selectedYears, ...dialogExtraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const selectedIndicatorObjects = indicators.filter(i => selectedIndicators.includes(i.id));
  const selectedCompanyObjects = companies.filter(c => selectedCompanies.includes(c.id));

  useEffect(() => {
    companiesApi.getAll().then(r => setCompanies(r.data));
    indicatorsApi.getAll().then(r => setIndicators(r.data));
  }, []);

  const handleCompanyChange = async (companyIds: number[]) => {
    setSelectedCompanies(companyIds);
    setResults({});
    const newExisting: Record<number, any> = {};
    for (const id of companyIds) {
      if (!existingData[id]) {
        const res = await financialsApi.getByCompany(id);
        newExisting[id] = res.data;
      } else {
        newExisting[id] = existingData[id];
      }
    }
    setExistingData(newExisting);
  };

  const openDataDialog = async (company: Company) => {
    setActiveCompany(company);
    const res = await financialsApi.getByCompany(company.id);
    const existing = res.data;
    const allVars = new Set<string>(COMMON_VARIABLES);
    Object.values(existing).forEach((yearData: any) => {
      Object.keys(yearData).forEach(v => allVars.add(v));
    });
    setVariables(Array.from(allVars));
    const init: Record<number, Record<string, string>> = {};
    for (const year of selectedYears) {
      init[year] = {};
      allVars.forEach(v => {
        init[year][v] = existing[year]?.[v]?.toString() || '';
      });
    }
    setFinancialData(init);
    setDataDialogOpen(true);
  };

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
            quarterResults[q] = res.data[opt.year];
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

  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables([...variables, v]);
      setNewVariable('');
    }
  };

  const handleAddDialogYear = () => {
    const y = parseInt(dialogNewYear);
    if (!isNaN(y) && y > 1900 && y < 2100 && !dialogYears.includes(y)) {
      const updated = [...dialogExtraYears, y];
      setDialogExtraYears(updated);
      localStorage.setItem('dialogExtraYears', JSON.stringify(updated));
      setDialogNewYear('');
    }
  };

  const periodLabels = mode === 'annual' ? sortedYears : selectedQuarters;

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
                <Tooltip title="Wprowadź dane ręcznie">
                  <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => openDataDialog(company)}>
                    Dane
                  </Button>
                </Tooltip>
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
          <FormControl fullWidth>
            <InputLabel>Lata</InputLabel>
            <Select
              multiple
              value={selectedYears}
              onChange={(e) => setSelectedYears(e.target.value as number[])}
              input={<OutlinedInput label="Lata" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).sort().map(y => (
                    <Chip
                      key={y}
                      label={y}
                      size="small"
                      color="primary"
                      onDelete={(e) => {
                        e.stopPropagation();
                        setSelectedYears(selectedYears.filter(year => year !== y));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ))}
                </Box>
              )}
            >
              {YEARS.map(y => (
                <MenuItem key={y} value={y} sx={{
                  backgroundColor: selectedYears.includes(y) ? '#1976d2 !important' : 'inherit',
                  color: selectedYears.includes(y) ? 'white !important' : 'inherit',
                  fontWeight: selectedYears.includes(y) ? 'bold' : 'normal',
                  '&.Mui-selected': { backgroundColor: '#1976d2 !important', color: 'white !important' },
                  '&.Mui-selected:hover': { backgroundColor: '#1565c0 !important' },
                }}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Kwartały</InputLabel>
            <Select
              multiple
              value={selectedQuarters}
              onChange={(e) => setSelectedQuarters(e.target.value as string[])}
              input={<OutlinedInput label="Kwartały" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map(q => (
                    <Chip
                      key={q}
                      label={q}
                      size="small"
                      color="primary"
                      onDelete={(e) => {
                        e.stopPropagation();
                        setSelectedQuarters(selectedQuarters.filter(sq => sq !== q));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ))}
                </Box>
              )}
            >
              {QUARTER_OPTIONS.map(q => (
                <MenuItem key={q.label} value={q.label} sx={{
                  backgroundColor: selectedQuarters.includes(q.label) ? '#1976d2 !important' : 'inherit',
                  color: selectedQuarters.includes(q.label) ? 'white !important' : 'inherit',
                  '&.Mui-selected': { backgroundColor: '#1976d2 !important', color: 'white !important' },
                  '&.Mui-selected:hover': { backgroundColor: '#1565c0 !important' },
                }}>
                  {q.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Paper>

      {/* 3. Wybierz wskaźniki */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>3. Wybierz wskaźniki</Typography>
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
            .map(i => (
              <Chip
                key={i.id}
                label={i.display_name}
                onClick={() => {
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
                  {(mode === 'annual' ? sortedYears : selectedQuarters).map(period =>
                    selectedCompanyObjects.map(company => (
                      <TableCell key={`${company.id}-${period}`} sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                        {company.ticker} {period}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedIndicatorObjects.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell><strong>{ind.display_name}</strong></TableCell>
                    {(mode === 'annual' ? sortedYears : selectedQuarters).map(period =>
                      selectedCompanyObjects.map(company => {
                        const val = mode === 'annual'
                          ? results[company.id]?.[period]?.[ind.display_name]
                          : results[company.id]?.[period]?.[ind.display_name];
                        return (
                          <TableCell key={`${company.id}-${period}`} align="right">
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
    </Box>
  );
}