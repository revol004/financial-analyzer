import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar, Tooltip, Collapse
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { companiesApi, financialsApi } from '../services/api';
import TableChartIcon from '@mui/icons-material/TableChart';
import FinancialDataDialog from '../components/FinancialDataDialog';
import UploadIcon from '@mui/icons-material/Upload';
interface Company {
  id: number;
  name: string;
  ticker: string;
  market: string;
  description?: string;
}

const emptyForm = { name: '', ticker: '', market: 'GPW', description: '' };

interface Props { mode: 'annual' | 'quarterly'; }
export default function Companies({ mode }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [financialData, setFinancialData] = useState<Record<number, any>>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
const [financialDialogOpen, setFinancialDialogOpen] = useState(false);
const [financialCompany, setFinancialCompany] = useState<Company | null>(null);
const [selectedYears] = useState<number[]>([2024, 2023, 2022, 2021, 2020]);

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

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditForm({
      name: company.name,
      ticker: company.ticker,
      market: company.market,
      description: company.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedCompany) return;
    try {
      await companiesApi.update(selectedCompany.id, editForm);
      setSnackbar({ open: true, message: 'Dane spółki zaktualizowane!', severity: 'success' });
      setEditDialogOpen(false);
      fetchCompanies();
    } catch {
      setSnackbar({ open: true, message: 'Błąd aktualizacji.', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Usunąć tę spółkę wraz z wszystkimi jej danymi?')) return;
    await companiesApi.delete(id);
    fetchCompanies();
  };

  const handleExpand = async (companyId: number) => {
  if (expandedRow === companyId) {
    setExpandedRow(null);
    return;
  }
  setExpandedRow(companyId);
  if (mode === 'annual') {
    const res = await financialsApi.getByCompany(companyId);
    setFinancialData(prev => ({ ...prev, [companyId]: res.data }));
  } else {
    const quarterData: Record<string, any> = {};
    await Promise.all(
      [1, 2, 3, 4].map(async q => {
        const res = await financialsApi.getByCompany(companyId, q);
        Object.entries(res.data).forEach(([year, vars]: [string, any]) => {
          Object.entries(vars).forEach(([variable, value]) => {
            const key = `Q${q} ${year}`;
            if (!quarterData[key]) quarterData[key] = {};
            quarterData[key][variable] = value;
          });
        });
      })
    );
    setFinancialData(prev => ({ ...prev, [companyId]: quarterData }));
  }
};

const handleImportCompany = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await financialsApi.import(0, file);
    setSnackbar({ open: true, message: 'Import zakończony!', severity: 'success' });
    fetchCompanies();
  } catch {
    setSnackbar({ open: true, message: 'Błąd importu.', severity: 'error' });
  }
};

  return (
  <Box sx={{ p: 4 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" fontWeight="bold">Spółki</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          component="label"
          sx={{ whiteSpace: 'nowrap' }}
        >
          Importuj z CSV
          <input
            type="file"
            hidden
            accept=".csv,.xlsx"
            onChange={handleImportCompany}
          />
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Dodaj spółkę
        </Button>
      </Box>
    </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#1565c0' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nazwa</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ticker</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rynek</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Opis</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dane</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Brak spółek – dodaj pierwszą!
                </TableCell>
              </TableRow>
            ) : (
              companies.map((c) => (
                <>
                  <TableRow key={c.id} hover>
                    <TableCell><strong>{c.name}</strong></TableCell>
                    <TableCell><Chip label={c.ticker} size="small" color="primary" /></TableCell>
                    <TableCell>{c.market}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{c.description || '—'}</TableCell>
                    <TableCell>
                      <Tooltip title="Pokaż dane finansowe">
                        <IconButton size="small" onClick={() => handleExpand(c.id)}>
                          {expandedRow === c.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
  <Tooltip title="Edytuj spółkę">
    <IconButton color="primary" size="small" onClick={() => handleEdit(c)}>
      <EditIcon />
    </IconButton>
  </Tooltip>
  <Tooltip title="Edytuj dane finansowe">
    <IconButton
      color="success"
      size="small"
      onClick={() => {
        setFinancialCompany(c);
        setFinancialDialogOpen(true);
      }}
    >
      <TableChartIcon />
    </IconButton>
  </Tooltip>
  <Tooltip title="Usuń spółkę">
    <IconButton color="error" size="small" onClick={() => handleDelete(c.id)}>
      <DeleteIcon />
    </IconButton>
  </Tooltip>
</TableCell>
                  </TableRow>

                  {/* Rozwinięty wiersz z danymi finansowymi */}
                  <TableRow key={`expand-${c.id}`}>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedRow === c.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            Dane finansowe – {c.name}
                          </Typography>
                          {financialData[c.id] && Object.keys(financialData[c.id]).length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                                  <TableCell><strong>Zmienna</strong></TableCell>
                                  {Object.keys(financialData[c.id]).sort().map(year => (
                                    <TableCell key={year} align="right"><strong>{year}</strong></TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Array.from(new Set(
                                  Object.values(financialData[c.id]).flatMap((y: any) => Object.keys(y))
                                )).map(variable => (
                                  <TableRow key={variable} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{variable}</TableCell>
                                    {Object.keys(financialData[c.id]).sort().map(year => (
                                      <TableCell key={year} align="right">
                                        {financialData[c.id][year][variable]?.toLocaleString() ?? '—'}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              Brak danych finansowych dla tej spółki.
                            </Alert>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
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
          <Button variant="contained" onClick={handleSubmit} disabled={!form.name || !form.ticker}>
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>

     {/* Dialog edycji spółki */}
<Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Edytuj spółkę – {selectedCompany?.name}</DialogTitle>
  <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
    <TextField
      label="Nazwa spółki"
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      fullWidth
      required
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      label="Ticker"
      value={editForm.ticker}
      onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value.toUpperCase() })}
      fullWidth
      required
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      label="Rynek"
      value={editForm.market}
      onChange={(e) => setEditForm({ ...editForm, market: e.target.value })}
      fullWidth
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      label="Opis (opcjonalnie)"
      value={editForm.description}
      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
      fullWidth
      multiline
      rows={2}
      InputLabelProps={{ shrink: true }}
    />
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setEditDialogOpen(false)}>Anuluj</Button>
    <Button variant="contained" onClick={handleEditSubmit} disabled={!editForm.name || !editForm.ticker}>
      Zapisz zmiany
    </Button>
  </DialogActions>
</Dialog>

<FinancialDataDialog
  open={financialDialogOpen}
  onClose={() => {
    setFinancialDialogOpen(false);
    setFinancialCompany(null);
  }}
  company={financialCompany}
  years={selectedYears}
  mode={mode}
/>

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