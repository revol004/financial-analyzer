import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import { indicatorsApi } from '../services/api';



interface Indicator {
  id: number;
  name: string;
  display_name: string;
  formula: string;
  description?: string;
  category?: string;
  is_percentage: number;
}

const emptyForm = { name: '', display_name: '', formula: '', description: '', category: '', categoryColor: 'default', is_percentage: 1 };

const COLOR_OPTIONS = [
  { value: 'success', label: 'Zielony' },
  { value: 'primary', label: 'Niebieski' },
  { value: 'error', label: 'Czerwony' },
  { value: 'warning', label: 'Pomarańczowy' },
  { value: 'default', label: 'Szary' },
];

const DEFAULT_INDICATORS = [
  { name: 'roe', display_name: 'ROE', formula: 'net_income / equity', description: 'Return on Equity', category: 'Profitability' },
  { name: 'roa', display_name: 'ROA', formula: 'net_income / total_assets', description: 'Return on Assets', category: 'Profitability' },
  { name: 'net_margin', display_name: 'Net Margin', formula: 'net_income / revenue', description: 'Net Profit Margin', category: 'Profitability' },
  { name: 'operating_margin', display_name: 'Operating Margin', formula: 'operating_income / revenue', description: 'Operating Profit Margin', category: 'Profitability' },
  { name: 'current_ratio', display_name: 'Current Ratio', formula: 'current_assets / current_liabilities', description: 'Current Liquidity Ratio', category: 'Liquidity' },
  { name: 'debt_ratio', display_name: 'Debt Ratio', formula: 'total_liabilities / total_assets', description: 'Total Debt Ratio', category: 'Leverage' },
];

export default function Indicators() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({
  'Profitability': 'success',
  'Liquidity': 'primary',
  'Leverage': 'error',
  'Value': 'warning',
});

const [defaultVariables, setDefaultVariables] = useState<string[]>(() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
});
const [variableDialogOpen, setVariableDialogOpen] = useState(false);
const [newVariableName, setNewVariableName] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchIndicators = async () => {
    const res = await indicatorsApi.getAll();
    setIndicators(res.data);
  };

  useEffect(() => { fetchIndicators(); }, []);

  const handleSubmit = async () => {
    try {
      await indicatorsApi.create({
  name: form.name,
  display_name: form.display_name,
  formula: form.formula,
  description: form.description,
  category: form.category,
  is_percentage: form.is_percentage,
});
      // Zapisz kolor dla kategorii
      if (form.category) {
        setCategoryColors(prev => ({ ...prev, [form.category]: form.categoryColor }));
      }
      setSnackbar({ open: true, message: 'Wskaźnik dodany!', severity: 'success' });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchIndicators();
    } catch {
      setSnackbar({ open: true, message: 'Błąd – wskaźnik już istnieje.', severity: 'error' });
    }
  };

  const handleAddDefaults = async () => {
    let added = 0;
    for (const ind of DEFAULT_INDICATORS) {
      try {
        await indicatorsApi.create(ind);
        added++;
      } catch {}
    }
    setSnackbar({ open: true, message: `Dodano ${added} domyślnych wskaźników!`, severity: 'success' });
    fetchIndicators();
  };

  const getChipColor = (category?: string): any => {
    if (!category) return 'default';
    return categoryColors[category] || 'default';
  };

const handleAddVariable = () => {
  const v = newVariableName.trim().toLowerCase().replace(/\s+/g, '_');
  if (v && !defaultVariables.includes(v)) {
    const updated = [...defaultVariables, v];
    setDefaultVariables(updated);
    localStorage.setItem('defaultVariables', JSON.stringify(updated));
    setSnackbar({ open: true, message: `Zmienna "${v}" dodana!`, severity: 'success' });
  }
  setNewVariableName('');
  setVariableDialogOpen(false);
};

const handleDeleteVariable = (variable: string) => {
  if (!window.confirm(`Usunąć zmienną "${variable}" z domyślnych?`)) return;
  const updated = defaultVariables.filter(v => v !== variable);
  setDefaultVariables(updated);
  localStorage.setItem('defaultVariables', JSON.stringify(updated));
};


  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Wskaźniki finansowe</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {indicators.length === 0 && (
            <Button variant="outlined" onClick={handleAddDefaults}>
              Dodaj domyślne wskaźniki
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Dodaj wskaźnik
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#e3f2fd' }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          Jak pisać formuły?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Używaj nazw zmiennych które wprowadzasz dla spółek, np: <code>zysk_netto / przychody</code> lub <code>aktywa_obrotowe / zobowiazania_krotkoterminowe</code>.
          Dozwolone operatory: <code>+ - * / ( )</code>
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#1565c0' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nazwa</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Kategoria</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Formuła</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Opis</TableCell>
<TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Typ</TableCell>
<TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indicators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Brak wskaźników – dodaj własne lub kliknij "Dodaj domyślne wskaźniki"
                </TableCell>
              </TableRow>
            ) : (
              indicators.map((ind) => (
                <TableRow key={ind.id} hover>
                  <TableCell><strong>{ind.display_name}</strong></TableCell>
                  <TableCell>
                    <Chip
                      label={ind.category || 'Inne'}
                      size="small"
                      color={getChipColor(ind.category)}
                    />
                  </TableCell>
                  <TableCell><code>{ind.formula}</code></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{ind.description || '—'}</TableCell>
<TableCell>
  <Chip
    label={ind.is_percentage ? '-' : '%'}
    size="small"
    color={ind.is_percentage ? 'default' : 'success'}
  />
</TableCell>
<TableCell>
  <Tooltip title="Usuń wskaźnik">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={async () => {
                          if (!window.confirm(`Usunąć wskaźnik ${ind.display_name}?`)) return;
                          await indicatorsApi.delete(ind.id);
                          fetchIndicators();
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj nowy wskaźnik</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nazwa wyświetlana (np. ROE)"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            fullWidth required
          />
          <TextField
            label="Formuła (np. zysk_netto / kapital_wlasny)"
            value={form.formula}
            onChange={(e) => setForm({ ...form, formula: e.target.value })}
            fullWidth required
            helperText="Używaj nazw zmiennych finansowych i operatorów + - * / ( )"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Kategoria (np. Rentowność)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              fullWidth
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Kolor kategorii</InputLabel>
              <Select
                value={form.categoryColor}
                label="Kolor kategorii"
                onChange={(e) => setForm({ ...form, categoryColor: e.target.value })}
              >
                {COLOR_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Chip label={opt.label} size="small" color={opt.value as any} sx={{ cursor: 'pointer' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="Opis (opcjonalnie)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth multiline rows={2}
          />
        </DialogContent>
<FormControlLabel
  control={
    <Switch
      checked={form.is_percentage === 1}
      onChange={(e) => setForm({ ...form, is_percentage: e.target.checked ? 1 : 0 })}
    />
  }
  label="Wynik w procentach"
/>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Anuluj</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.display_name || !form.formula}
          >
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>


{/* Sekcja zmiennych */}
<Paper sx={{ p: 3, mt: 4 }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="h6" fontWeight="bold">Domyślne zmienne finansowe</Typography>
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      onClick={() => setVariableDialogOpen(true)}
    >
      Dodaj zmienną
    </Button>
  </Box>
  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    Te zmienne pojawiają się domyślnie przy wprowadzaniu danych finansowych dla każdej spółki.
  </Typography>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {defaultVariables.map(variable => (
      <Chip
        key={variable}
        label={variable}
        onDelete={() => handleDeleteVariable(variable)}
        sx={{ fontFamily: 'monospace' }}
      />
    ))}
  </Box>
</Paper>

<Dialog open={variableDialogOpen} onClose={() => setVariableDialogOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Dodaj domyślną zmienną</DialogTitle>
  <DialogContent sx={{ pt: '16px !important' }}>
    <TextField
      label="Nazwa zmiennej (np. ebitda)"
      value={newVariableName}
      onChange={(e) => setNewVariableName(e.target.value)}
      fullWidth
      helperText="Używaj małych liter i podkreśleń zamiast spacji"
      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
    />
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setVariableDialogOpen(false)}>Anuluj</Button>
    <Button variant="contained" onClick={handleAddVariable} disabled={!newVariableName}>
      Dodaj
    </Button>
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