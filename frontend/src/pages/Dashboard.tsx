import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, OutlinedInput, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, CircularProgress,
  Divider, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Tabs, Tab, Tooltip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import { companiesApi, financialsApi, indicatorsApi } from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


interface Company { id: number; name: string; ticker: string; }
interface Indicator { id: number; display_name: string; category?: string; }

const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i);
const COMMON_VARIABLES = [
  'przychody', 'zysk_netto', 'zysk_operacyjny', 'kapital_wlasny',
  'aktywa_ogółem', 'aktywa_obrotowe', 'zobowiazania_ogółem', 'zobowiazania_krotkoterminowe'
];

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([2024, 2023, 2022]);
  const [selectedIndicators, setSelectedIndicators] = useState<number[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Dialog danych finansowych
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [financialData, setFinancialData] = useState<Record<number, Record<string, string>>>({});
  const [existingData, setExistingData] = useState<any>({});
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [newVariable, setNewVariable] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    companiesApi.getAll().then(r => setCompanies(r.data));
    indicatorsApi.getAll().then(r => setIndicators(r.data));
  }, []);

  const handleCompanyChange = async (companyId: number) => {
    setSelectedCompany(companyId);
    setResults(null);
    const res = await financialsApi.getByCompany(companyId);
    setExistingData(res.data);
  };

  const openDataDialog = () => {
    const init: Record<number, Record<string, string>> = {};
    for (const year of selectedYears) {
      init[year] = {};
      for (const v of variables) {
        init[year][v] = existingData[year]?.[v]?.toString() || '';
      }
    }
    setFinancialData(init);
    setDataDialogOpen(true);
  };

  const handleSaveData = async () => {
    try {
      for (const year of selectedYears) {
        for (const variable of variables) {
          const val = financialData[year]?.[variable];
          if (val !== '' && val !== undefined && !isNaN(Number(val))) {
            await financialsApi.upsert({
              company_id: selectedCompany,
              year,
              variable_name: variable,
              value: parseFloat(val)
            });
          }
        }
      }
      const res = await financialsApi.getByCompany(selectedCompany as number);
      setExistingData(res.data);
      setSnackbar({ open: true, message: 'Dane zapisane!', severity: 'success' });
      setDataDialogOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Błąd zapisu danych.', severity: 'error' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    try {
      await financialsApi.import(selectedCompany as number, file);
      const res = await financialsApi.getByCompany(selectedCompany as number);
      setExistingData(res.data);
      setSnackbar({ open: true, message: 'Import zakończony sukcesem!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Błąd importu pliku.', severity: 'error' });
    }
  };

  const handleCalculate = async () => {
    if (!selectedCompany || selectedYears.length === 0 || selectedIndicators.length === 0) return;
    setLoading(true);
    try {
      const res = await indicatorsApi.calculate({
        company_id: selectedCompany,
        indicator_ids: selectedIndicators,
        years: selectedYears.sort()
      });
      setResults(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Błąd obliczania wskaźników.', severity: 'error' });
    }
    setLoading(false);
  };

  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables([...variables, v]);
      setNewVariable('');
    }
  };

  const sortedYears = [...selectedYears].sort();
  const selectedIndicatorObjects = indicators.filter(i => selectedIndicators.includes(i.id));
  const company = companies.find(c => c.id === selectedCompany);

const handleExportExcel = () => {
  if (!results || !company) return;

  const rows: any[] = [];

  selectedIndicatorObjects.forEach(ind => {
    const row: any = { 'Wskaźnik': ind.display_name };
    sortedYears.forEach(y => {
      const val = results[y]?.[ind.display_name];
      row[y.toString()] = val !== null && val !== undefined
        ? parseFloat((val * 100).toFixed(2))
        : 'brak danych';
    });
    rows.push(row);
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Wskaźniki');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${company.ticker}_wskazniki.xlsx`);
};



  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Kalkulator wskaźników
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>1. Wybierz spółkę</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Spółka</InputLabel>
            <Select
              value={selectedCompany}
              label="Spółka"
              onChange={(e) => handleCompanyChange(e.target.value as number)}
            >
              {companies.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <strong>{c.ticker}</strong>&nbsp;– {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCompany && (
            <>
              <Tooltip title="Wprowadź dane ręcznie">
                <Button variant="outlined" startIcon={<EditIcon />} onClick={openDataDialog}>
                  Wprowadź dane
                </Button>
              </Tooltip>
              <Tooltip title="Importuj z CSV/Excel">
                <Button variant="outlined" startIcon={<UploadIcon />} component="label">
                  Import CSV/Excel
                  <input type="file" hidden accept=".csv,.xlsx" onChange={handleImport} />
                </Button>
              </Tooltip>
            </>
          )}
        </Box>

        {selectedCompany && Object.keys(existingData).length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Dane dostępne za lata: {Object.keys(existingData).sort().join(', ')}
          </Alert>
        )}
        {selectedCompany && Object.keys(existingData).length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Brak danych dla tej spółki – wprowadź dane ręcznie lub zaimportuj plik.
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>2. Wybierz lata</Typography>
        <FormControl fullWidth>
          <InputLabel>Lata</InputLabel>
          <Select
            multiple
            value={selectedYears}
            onChange={(e) => setSelectedYears(e.target.value as number[])}
            input={<OutlinedInput label="Lata" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as number[]).sort().map(y => <Chip key={y} label={y} size="small" />)}
              </Box>
            )}
          >
            {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>3. Wybierz wskaźniki</Typography>
        <FormControl fullWidth>
          <InputLabel>Wskaźniki</InputLabel>
          <Select
            multiple
            value={selectedIndicators}
            onChange={(e) => setSelectedIndicators(e.target.value as number[])}
            input={<OutlinedInput label="Wskaźniki" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {indicators
                  .filter(i => (selected as number[]).includes(i.id))
                  .map(i => <Chip key={i.id} label={i.display_name} size="small" color="primary" />)}
              </Box>
            )}
          >
            {indicators.map(i => (
              <MenuItem key={i.id} value={i.id}>
                {i.display_name} {i.category && `(${i.category})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
  <Button
    variant="contained"
    size="large"
    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
    onClick={handleCalculate}
    disabled={!selectedCompany || selectedYears.length === 0 || selectedIndicators.length === 0 || loading}
    sx={{ px: 4, py: 1.5 }}
  >
    {loading ? 'Obliczanie...' : 'Oblicz wskaźniki'}
  </Button>

  {results && (
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

      {results && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Wyniki – {company?.name} ({company?.ticker})
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#1565c0' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wskaźnik</TableCell>
                  {sortedYears.map(y => (
                    <TableCell key={y} sx={{ color: 'white', fontWeight: 'bold' }} align="right">{y}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedIndicatorObjects.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell><strong>{ind.display_name}</strong></TableCell>
                    {sortedYears.map(y => {
                      const val = results[y]?.[ind.display_name];
                      return (
                        <TableCell key={y} align="right">
                          {val === null || val === undefined ? (
                            <Chip label="brak danych" size="small" color="warning" />
                          ) : (
                            <strong>{(val * 100).toFixed(2)}%</strong>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog wprowadzania danych */}
      <Dialog open={dataDialogOpen} onClose={() => setDataDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Dane finansowe – {company?.name}
          <Typography variant="body2" color="text.secondary">
            Wartości w tysiącach PLN (lub innej jednostce – zachowaj spójność)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            {sortedYears.map((y, i) => <Tab key={y} label={y} value={i} />)}
          </Tabs>

          {sortedYears.map((year, i) => (
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

              <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
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