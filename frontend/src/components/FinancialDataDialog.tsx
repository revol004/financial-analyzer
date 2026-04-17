/**
 * FinancialDataDialog.tsx
 * 
 * Dialog do wprowadzania i edycji danych finansowych spółki:
 * - obsługuje dane roczne i kwartalne
 * - dynamiczne zmienne finansowe (np. revenue, net_income)
 * - możliwość dodawania nowych lat i zmiennych
 * - zapis danych do backendu (upsert)
 */



import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tabs, Tab, Box, Typography, Paper,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { financialsApi } from '../services/api';
import { useMemo } from 'react';
// ==================================================================== PROPS ===================================================

interface Props {
  open: boolean;
  onClose: () => void;
  company: { id: number; name: string } | null;
  years: number[];
  mode?: 'annual' | 'quarterly';
}

// ================================================================= STAŁE ====================================================

// Domyślne zmienne finansowe (z localStorage lub fallback)
const COMMON_VARIABLES = (() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
})();

// Nazwy kwartałów
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ======================================================================== TYPY ==================================================

// Reprezentuje jeden okres (rok lub kwartał)
interface Period {
  label: string;
  year: number;
  quarter: number | null;
}

export default function FinancialDataDialog({ open, onClose, company, years, mode = 'annual' }: Props) {

   // ========================================================== STATE ========================================================

  const [tab, setTab] = useState(0);

   // lista zmiennych finansowych (kolumny)
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
   // dane: { "2023": { revenue: "123", net_income: "456" } }
  const [financialData, setFinancialData] = useState<Record<string, Record<string, string>>>({});
  const [newVariable, setNewVariable] = useState('');
  const [newYear, setNewYear] = useState('');

  // dodatkowe lata dodane ręcznie (localStorage per company)
  const [extraYears, setExtraYears] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // ================================================================ EFFECTS ===============================================

  // Ładuje dodatkowe lata z localStorage dla danej spółki
  useEffect(() => {
    if (company?.id) {
      const saved = localStorage.getItem(`extraYears_${company.id}`);
      setExtraYears(saved ? JSON.parse(saved) : []);
    }
  }, [company?.id]);

// ============================================================== WYLICZANE DANE =================================================

  // Wszystkie lata (z backendu + ręcznie dodane)
  const allYears = [...years, ...extraYears]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  // Generuj okresy – roczne lub kwartalne
  const periods: Period[] = useMemo(() => {
  return mode === 'annual'
    ? allYears.map(y => ({ label: y.toString(), year: y, quarter: null }))
    : allYears.flatMap(y =>
        QUARTERS.map((q, qi) => ({ label: `${q} ${y}`, year: y, quarter: qi + 1 }))
      );
}, [mode, allYears]);

 // =============================================================== FETCH DANYCH ===================================================

  // Pobiera dane finansowe i mapuje je do struktury UI
  useEffect(() => {
    if (open && company) {
    const fetchData = async () => {
  setLoadingData(true);
  console.time('fetch-total');
  const init: Record<string, Record<string, string>> = {};
  const allVars = new Set<string>(COMMON_VARIABLES);

  if (mode === 'annual') {

    // Jedno zapytanie dla wszystkich danych rocznych
    const res = await financialsApi.getByCompany(company.id);
     // zbieramy wszystkie zmienne jakie istnieją w danych
    Object.values(res.data).forEach((yearData: any) => {
      Object.keys(yearData).forEach(v => allVars.add(v));
    });
    setVariables(Array.from(allVars));
    // mapowanie danych do UI
    periods.forEach(period => {
      init[period.label] = {};
      allVars.forEach(v => {
        init[period.label][v] = res.data[period.year]?.[v]?.toString() || '';
      });
    });
  } else {
    // Dane kwartalne – równoległe zapytania dla Q1–Q4
    const quarterData: Record<number, any> = {};
   console.time('fetch-requests');
    await Promise.all(
      [1, 2, 3, 4].map(async q => {
        const res = await financialsApi.getByCompany(company.id, q);
        quarterData[q] = res.data;
        Object.values(res.data).forEach((yearData: any) => {
          Object.keys(yearData).forEach(v => allVars.add(v));
        });
      })
    );
    console.timeEnd('fetch-requests');
    console.time('mapping');
    setVariables(Array.from(allVars));
    // mapowanie danych kwartalnych
    periods.forEach(period => {
      init[period.label] = {};
      allVars.forEach(v => {
        init[period.label][v] = period.quarter !== null
          ? quarterData[period.quarter]?.[period.year]?.[v]?.toString() || ''
          : '';
      });
    });
  }

  console.timeEnd('fetch-total');
  console.timeEnd('mapping');
  setFinancialData(init);
  setLoadingData(false);
};
      fetchData();
    }
  }, [open, company, mode]);

 // ================================================================= HANDLERY ====================================================

  // Dodaje nową zmienną finansową (np. EBITDA)
  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables(prev => [...prev, v]);
  // dodajemy zmienną do wszystkich okresów
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
  // Dodaje nowy rok (zapisywany w localStorage)
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
  // Zapis danych do backendu (upsert per pole)
  const handleSave = async () => {
  if (!company) return;
  setSaving(true);
  const requests = periods.flatMap(period =>
    variables
      .filter(variable => {
        const val = financialData[period.label]?.[variable];
        return val !== '' && val !== undefined && !isNaN(Number(val));
      })
      .map(variable => financialsApi.upsert({
        company_id: company.id,
        year: period.year,
        quarter: period.quarter,
        variable_name: variable,
        value: parseFloat(financialData[period.label][variable])
      }))
  );
  await Promise.all(requests); // wszystkie równolegle ✅
  setSaving(false);
  onClose();
};
 // ================================================================== UI ======================================================
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
         <Box key={period.label} hidden={tab !== i} sx={{ display: tab !== i ? 'none' : 'block' }}>
  {tab === i && (
    <>
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