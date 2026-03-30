import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tabs, Tab, Box, Typography, Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { financialsApi } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  company: { id: number; name: string } | null;
  years: number[];
}

const COMMON_VARIABLES = [
  'przychody', 'zysk_netto', 'zysk_operacyjny', 'kapital_wlasny',
  'aktywa_ogółem', 'aktywa_obrotowe', 'zobowiazania_ogółem', 'zobowiazania_krotkoterminowe'
];

export default function FinancialDataDialog({ open, onClose, company, years }: Props) {
  const [tab, setTab] = useState(0);
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [financialData, setFinancialData] = useState<Record<number, Record<string, string>>>({});
  const [newVariable, setNewVariable] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedYears = [...years].sort((a, b) => a - b);

  useEffect(() => {
    if (open && company) {
      financialsApi.getByCompany(company.id).then(res => {
        const existing = res.data;
        const init: Record<number, Record<string, string>> = {};

        // Zbierz wszystkie zmienne z istniejących danych
        const allVars = new Set<string>(COMMON_VARIABLES);
        Object.values(existing).forEach((yearData: any) => {
          Object.keys(yearData).forEach(v => allVars.add(v));
        });
        setVariables(Array.from(allVars));

        for (const year of years) {
          init[year] = {};
          allVars.forEach(v => {
            init[year][v] = existing[year]?.[v]?.toString() || '';
          });
        }
        setFinancialData(init);
      });
    }
  }, [open, company]);

  const addVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables(prev => [...prev, v]);
      setFinancialData(prev => {
        const updated = { ...prev };
        for (const year of years) {
          updated[year] = { ...updated[year], [v]: '' };
        }
        return updated;
      });
      setNewVariable('');
    }
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    for (const year of years) {
      for (const variable of variables) {
        const val = financialData[year]?.[variable];
        if (val !== '' && val !== undefined && !isNaN(Number(val))) {
          await financialsApi.upsert({
            company_id: company.id,
            year,
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
          Wartości w tysiącach PLN (zachowaj spójność jednostek)
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
          </Box>
        ))}
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