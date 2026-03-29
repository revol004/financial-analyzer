import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar, Tooltip
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
}

const emptyForm = { name: '', display_name: '', formula: '', description: '', category: '' };

const CATEGORY_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'default'> = {
  'Rentowność': 'success',
  'Płynność': 'primary',
  'Zadłużenie': 'error',
  'Wartość': 'warning',
};

const DEFAULT_INDICATORS = [
  { name: 'roe', display_name: 'ROE', formula: 'zysk_netto / kapital_wlasny', description: 'Zwrot z kapitału własnego', category: 'Rentowność' },
  { name: 'roa', display_name: 'ROA', formula: 'zysk_netto / aktywa_ogółem', description: 'Zwrot z aktywów', category: 'Rentowność' },
  { name: 'marza_netto', display_name: 'Marża netto', formula: 'zysk_netto / przychody', description: 'Marża zysku netto', category: 'Rentowność' },
  { name: 'marza_operacyjna', display_name: 'Marża operacyjna', formula: 'zysk_operacyjny / przychody', description: 'Marża zysku operacyjnego', category: 'Rentowność' },
  { name: 'current_ratio', display_name: 'Current Ratio', formula: 'aktywa_obrotowe / zobowiazania_krotkoterminowe', description: 'Wskaźnik płynności bieżącej', category: 'Płynność' },
  { name: 'debt_ratio', display_name: 'Debt Ratio', formula: 'zobowiazania_ogółem / aktywa_ogółem', description: 'Wskaźnik zadłużenia', category: 'Zadłużenie' },
];

export default function Indicators() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchIndicators = async () => {
    const res = await indicatorsApi.getAll();
    setIndicators(res.data);
  };

  useEffect(() => { fetchIndicators(); }, []);

  const handleSubmit = async () => {
    try {
      await indicatorsApi.create(form);
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

      {/* Legenda formuł */}
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
                      color={CATEGORY_COLORS[ind.category || ''] || 'default'}
                    />
                  </TableCell>
                  <TableCell><code>{ind.formula}</code></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{ind.description || '—'}</TableCell>
                  <TableCell>
                    <Tooltip title="Usuń wskaźnik">
                      <IconButton color="error" size="small">
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

      {/* Dialog dodawania wskaźnika */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj nowy wskaźnik</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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
          <TextField
            label="Kategoria (np. Rentowność, Płynność)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            fullWidth
          />
          <TextField
            label="Opis (opcjonalnie)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth multiline rows={2}
          />
        </DialogContent>
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