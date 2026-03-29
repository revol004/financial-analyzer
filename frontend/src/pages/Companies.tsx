import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { companiesApi } from '../services/api';

interface Company {
  id: number;
  name: string;
  ticker: string;
  market: string;
  description?: string;
}

const emptyForm = { name: '', ticker: '', market: 'GPW', description: '' };

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchCompanies = async () => {
    const res = await companiesApi.getAll();
    setCompanies(res.data);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleSubmit = async () => {
    try {
      await companiesApi.create(form);
      setSnackbar({ open: true, message: 'Spółka dodana pomyślnie!', severity: 'success' });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchCompanies();
    } catch {
      setSnackbar({ open: true, message: 'Błąd – ticker już istnieje.', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Usunąć tę spółkę?')) return;
    await companiesApi.delete(id);
    fetchCompanies();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Spółki</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Dodaj spółkę
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#1565c0' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nazwa</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ticker</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rynek</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Opis</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Brak spółek – dodaj pierwszą!
                </TableCell>
              </TableRow>
            ) : (
              companies.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell><strong>{c.name}</strong></TableCell>
                  <TableCell><Chip label={c.ticker} size="small" color="primary" /></TableCell>
                  <TableCell>{c.market}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{c.description || '—'}</TableCell>
                  <TableCell>
                    <IconButton color="error" onClick={() => handleDelete(c.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog dodawania spółki */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj nową spółkę</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Nazwa spółki"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth required
          />
          <TextField
            label="Ticker (np. PKN, CDR)"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            fullWidth required
          />
          <TextField
            label="Rynek"
            value={form.market}
            onChange={(e) => setForm({ ...form, market: e.target.value })}
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
            disabled={!form.name || !form.ticker}
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