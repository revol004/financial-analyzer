import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tabs, Tab, Box, Typography, Paper,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
  useEffect(() => {
    if (company?.id) {
      const saved = localStorage.getItem(`extraYears_${company.id}`);
      setExtraYears(saved ? JSON.parse(saved) : []);
    }
  }, [company?.id]);

  const allYears = [...years, ...extraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  // Generuj okresy – roczne lub kwartalne
  const periods: Period[] = mode === 'annual'
    ? allYears.map(y => ({ label: y.toString(), year: y, quarter: null }))
    : allYears.flatMap(y =>
        QUARTERS.map((q, qi) => ({ label: `${q} ${y}`, year: y, quarter: qi + 1 }))
      );

  useEffect(() => {
    if (open && company) {
     const fetchData = async () => {
  setLoadingData(true);
  const init: Record<string, Record<string, string>> = {};
  const allVars = new Set<string>(COMMON_VARIABLES);

  if (mode === 'annual') {
    // Jedno zapytanie dla wszystkich danych rocznych
    const res = await financialsApi.getByCompany(company.id);
    Object.values(res.data).forEach((yearData: any) => {
      Object.keys(yearData).forEach(v => allVars.add(v));
    });
    setVariables(Array.from(allVars));
    periods.forEach(period => {
      init[period.label] = {};
      allVars.forEach(v => {
        init[period.label][v] = res.data[period.year]?.[v]?.toString() || '';
      });
    });
  } else {
    // Cztery zapytania dla Q1-Q4 zamiast osobnego dla każdego okresu
    const quarterData: Record<number, any> = {};
    await Promise.all(
      [1, 2, 3, 4].map(async q => {
        const res = await financialsApi.getByCompany(company.id, q);
        quarterData[q] = res.data;
        Object.values(res.data).forEach((yearData: any) => {
          Object.keys(yearData).forEach(v => allVars.add(v));
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
  }, [open, company, mode, periods]);

  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables(prev => [...prev, v]);
      setFinancialData(prev => {
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

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    for (const period of periods) {
      for (const variable of variables) {
        const val = financialData[period.label]?.[variable];
        if (val !== '' && val !== undefined && !isNaN(Number(val))) {
          await financialsApi.upsert({
            company_id: company.id,
            year: period.year,
            quarter: period.quarter,
            variable_name: variable,
            value: parseFloat(val)
          });
        }
      }
    }
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
                          value={financialData[period.label]?.[variable] || ''}
                          onChange={(e) => setFinancialData(prev => ({
                            ...prev,
                            [period.label]: { ...prev[period.label], [variable]: e.target.value }
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