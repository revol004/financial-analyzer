import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Tabs, Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
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
  agg_type?: string;
  agg_years?: number;
  base_indicator_id?: number;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aggDialogOpen, setAggDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [aggForm, setAggForm] = useState({
  display_name: '',
  agg_type: 'median',
  agg_years: 5,
  base_indicator_id: 0,
  source_type: 'indicator',
  raw_variable: '',
  category: '',
  is_percentage: 1,
});
const [changeDialogOpen, setChangeDialogOpen] = useState(false);
const [changeForm, setChangeForm] = useState({
  display_name: '',
  change_type: 'yoy',
  change_years: 5,
  source_type: 'indicator',
  base_indicator_id: 0,
  raw_variable: '',
  category: '',
  is_percentage: 1,
});

const handleChangeSubmit = async () => {
  const isRaw = changeForm.source_type === 'raw';
  const base = isRaw ? null : indicators.find(i => i.id === changeForm.base_indicator_id);
  if (!isRaw && !base) return;
  if (isRaw && !changeForm.raw_variable) return;

  const typeLabel = changeForm.change_type === 'yoy' ? 'YoY' : `${changeForm.change_years}Y Change`;
  const sourceName = isRaw ? changeForm.raw_variable : base!.display_name;

  try {
    await indicatorsApi.create({
      name: `${changeForm.change_type}_${isRaw ? changeForm.raw_variable : base!.name}`,
      display_name: changeForm.display_name || `${sourceName} ${typeLabel}`,
      formula: isRaw ? changeForm.raw_variable : base!.formula,
      description: `${typeLabel} change of ${sourceName}`,
      category: changeForm.category || (isRaw ? '' : base?.category),
      is_percentage: 1,
      agg_type: changeForm.change_type === 'yoy' ? 'yoy' : 'change_n',
      agg_years: changeForm.change_type === 'yoy' ? 1 : changeForm.change_years,
      base_indicator_id: isRaw ? null : changeForm.base_indicator_id,
    });
    setSnackbar({ open: true, message: 'Wskaźnik zmiany % dodany!', severity: 'success' });
    setChangeDialogOpen(false);
    setChangeForm({ display_name: '', change_type: 'yoy', change_years: 5, source_type: 'indicator', base_indicator_id: 0, raw_variable: '', category: '', is_percentage: 1 });
    fetchIndicators();
  } catch {
    setSnackbar({ open: true, message: 'Błąd – wskaźnik już istnieje.', severity: 'error' });
  }
};


  const [categoryTab, setCategoryTab] = useState('all');
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('categoryColors');
    return saved ? JSON.parse(saved) : {
      'Profitability': 'success',
      'Liquidity': 'primary',
      'Leverage': 'error',
      'Value': 'warning',
    };
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

  const categories = ['all', ...Array.from(new Set(indicators.map(i => i.category || 'Other')))];
  const filteredIndicators = categoryTab === 'all'
    ? indicators
    : indicators.filter(i => (i.category || 'Other') === categoryTab);

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
      if (form.category) {
        const updated = { ...categoryColors, [form.category]: form.categoryColor };
        setCategoryColors(updated);
        localStorage.setItem('categoryColors', JSON.stringify(updated));
      }
      setSnackbar({ open: true, message: 'Wskaźnik dodany!', severity: 'success' });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchIndicators();
    } catch {
      setSnackbar({ open: true, message: 'Błąd – wskaźnik już istnieje.', severity: 'error' });
    }
  };

const handleAggSubmit = async () => {
  const isRaw = aggForm.source_type === 'raw';
  const base = isRaw ? null : indicators.find(i => i.id === aggForm.base_indicator_id);
  if (!isRaw && !base) return;
  if (isRaw && !aggForm.raw_variable) return;

  const sourceName = isRaw ? aggForm.raw_variable : base!.display_name;

  try {
    await indicatorsApi.create({
      name: `${aggForm.agg_type}_${aggForm.agg_years}y_${isRaw ? aggForm.raw_variable : base!.name}`,
      display_name: aggForm.display_name ||
        `${sourceName} ${aggForm.agg_years}Y ${aggForm.agg_type === 'median' ? 'Median' : 'Mean'}`,
      formula: isRaw ? aggForm.raw_variable : base!.formula,
      description: `${aggForm.agg_type === 'median' ? 'Median' : 'Mean'} of ${sourceName} over ${aggForm.agg_years} years`,
      category: aggForm.category || (isRaw ? '' : base!.category),
      is_percentage: isRaw ? 0 : base!.is_percentage,
      agg_type: aggForm.agg_type,
      agg_years: aggForm.agg_years,
      base_indicator_id: isRaw ? null : aggForm.base_indicator_id,
    });
    setSnackbar({ open: true, message: 'Wskaźnik agregowany dodany!', severity: 'success' });
    setAggDialogOpen(false);
    setAggForm({ display_name: '', agg_type: 'median', agg_years: 5, base_indicator_id: 0, source_type: 'indicator', raw_variable: '', category: '', is_percentage: 1 });
    fetchIndicators();
  } catch {
    setSnackbar({ open: true, message: 'Błąd – wskaźnik już istnieje.', severity: 'error' });
  }
};

  const handleEditOpen = (indicator: Indicator) => {
  if (indicator.agg_type) {
    setSnackbar({
      open: true,
      message: `Wskaźniki agregowane i zmiany % nie mogą być edytowane – usuń i stwórz ponownie.`,
      severity: 'error'
    });
    return;
  }
  setSelectedIndicator(indicator);
  setEditForm({
    name: indicator.name,
    display_name: indicator.display_name,
    formula: indicator.formula,
    description: indicator.description || '',
    category: indicator.category || '',
    categoryColor: categoryColors[indicator.category || ''] || 'default',
    is_percentage: indicator.is_percentage,
  });
  setEditDialogOpen(true);
};

  const handleEditSubmit = async () => {
    if (!selectedIndicator) return;
    try {
      await indicatorsApi.update(selectedIndicator.id, {
        name: editForm.name,
        display_name: editForm.display_name,
        formula: editForm.formula,
        description: editForm.description,
        category: editForm.category,
        is_percentage: editForm.is_percentage,
      });
      if (editForm.category) {
        const updated = { ...categoryColors, [editForm.category]: editForm.categoryColor };
        setCategoryColors(updated);
        localStorage.setItem('categoryColors', JSON.stringify(updated));
      }
      setSnackbar({ open: true, message: 'Wskaźnik zaktualizowany!', severity: 'success' });
      setEditDialogOpen(false);
      fetchIndicators();
    } catch {
      setSnackbar({ open: true, message: 'Błąd aktualizacji.', severity: 'error' });
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

  const getChipColor = (category?: string): any => {
    if (!category) return 'default';
    return categoryColors[category] || 'default';
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
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAggDialogOpen(true)}>
            Dodaj agregat
          </Button>
<Button variant="outlined" startIcon={<AddIcon />} onClick={() => setChangeDialogOpen(true)}>
  Dodaj zmianę %
</Button>

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
          Używaj nazw zmiennych które wprowadzasz dla spółek, np: <code>net_income / revenue</code>.
          Dozwolone operatory: <code>+ - * / ( )</code>
        </Typography>
      </Paper>

      <Tabs
        value={categoryTab}
        onChange={(_, v) => setCategoryTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map(cat => (
          <Tab key={cat} label={cat === 'all' ? 'All' : cat} value={cat} />
        ))}
      </Tabs>

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
            {filteredIndicators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Brak wskaźników – dodaj własne lub kliknij "Dodaj domyślne wskaźniki"
                </TableCell>
              </TableRow>
            ) : (
              filteredIndicators.map((ind) => (
                <TableRow key={ind.id} hover>
                  <TableCell><strong>{ind.display_name}</strong></TableCell>
                  <TableCell>
                    <Chip label={ind.category || 'Inne'} size="small" color={getChipColor(ind.category)} />
                  </TableCell>
                  <TableCell><code>{ind.formula}</code></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{ind.description || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip label={ind.is_percentage ? '%' : '-'} size="small" color={ind.is_percentage ? 'success' : 'default'} />
                      {ind.agg_type && (
                        <Chip label={ind.agg_type === 'median' ? `${ind.agg_years}Y Med` : `${ind.agg_years}Y Avg`} size="small" color="secondary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edytuj wskaźnik">
                      <IconButton color="primary" size="small" onClick={() => handleEditOpen(ind)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
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

      <Paper sx={{ p: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">Domyślne zmienne finansowe</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setVariableDialogOpen(true)}>
            Dodaj zmienną
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Te zmienne pojawiają się domyślnie przy wprowadzaniu danych finansowych.
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

      {/* Dialog dodawania wskaźnika */}
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
            label="Formuła (np. net_income / equity)"
            value={form.formula}
            onChange={(e) => setForm({ ...form, formula: e.target.value })}
            fullWidth required
            helperText="Używaj nazw zmiennych finansowych i operatorów + - * / ( )"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Kategoria"
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
          <FormControlLabel
            control={
              <Switch
                checked={form.is_percentage === 1}
                onChange={(e) => setForm({ ...form, is_percentage: e.target.checked ? 1 : 0 })}
              />
            }
            label="Wynik w procentach (wizualnie)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.display_name || !form.formula}>
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog edycji wskaźnika */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edytuj wskaźnik – {selectedIndicator?.display_name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nazwa wyświetlana"
            value={editForm.display_name}
            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
            fullWidth required
          />
          <TextField
            label="Formuła"
            value={editForm.formula}
            onChange={(e) => setEditForm({ ...editForm, formula: e.target.value })}
            fullWidth required
            helperText="Używaj nazw zmiennych finansowych i operatorów + - * / ( )"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Kategoria"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              fullWidth
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Kolor kategorii</InputLabel>
              <Select
                value={editForm.categoryColor}
                label="Kolor kategorii"
                onChange={(e) => setEditForm({ ...editForm, categoryColor: e.target.value })}
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
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            fullWidth multiline rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editForm.is_percentage === 1}
                onChange={(e) => setEditForm({ ...editForm, is_percentage: e.target.checked ? 1 : 0 })}
              />
            }
            label="Wynik w procentach (wizualnie)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={!editForm.display_name || !editForm.formula}>
            Zapisz zmiany
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog agregatu */}
      <Dialog open={aggDialogOpen} onClose={() => setAggDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Dodaj wskaźnik agregowany</DialogTitle>
  <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
    <TextField
      label="Nazwa wyświetlana (opcjonalnie)"
      value={aggForm.display_name}
      onChange={(e) => setAggForm({ ...aggForm, display_name: e.target.value })}
      fullWidth
      helperText="Zostaw puste aby wygenerować automatycznie np. 'ROE 5Y Median'"
    />
   <FormControl fullWidth>
  <InputLabel>Typ źródła</InputLabel>
  <Select
    value={aggForm.source_type || 'indicator'}
    label="Typ źródła"
    onChange={(e) => setAggForm({ ...aggForm, source_type: e.target.value, base_indicator_id: 0, raw_variable: '' })}
  >
    <MenuItem value="indicator">Wskaźnik (np. ROE, marża)</MenuItem>
    <MenuItem value="raw">Surowe dane (np. longterm_debt)</MenuItem>
  </Select>
</FormControl>

{(aggForm.source_type || 'indicator') === 'indicator' ? (
  <FormControl fullWidth>
    <InputLabel>Wskaźnik bazowy</InputLabel>
    <Select
      value={aggForm.base_indicator_id}
      label="Wskaźnik bazowy"
      onChange={(e) => setAggForm({ ...aggForm, base_indicator_id: e.target.value as number })}
    >
      {Array.from(new Set(indicators.filter(i => !i.agg_type).map(i => i.category || 'Other'))).map(cat => [
        <MenuItem key={`cat-${cat}`} disabled sx={{ fontWeight: 'bold', color: 'text.primary', opacity: '1 !important', backgroundColor: '#f5f5f5' }}>
          {cat}
        </MenuItem>,
        ...indicators.filter(i => !i.agg_type && (i.category || 'Other') === cat).map(i => (
          <MenuItem key={i.id} value={i.id} sx={{ pl: 3 }}>
            {i.display_name}
          </MenuItem>
        ))
      ])}
    </Select>
  </FormControl>
) : (
  <TextField
    label="Nazwa zmiennej (np. longterm_debt)"
    value={aggForm.raw_variable || ''}
    onChange={(e) => setAggForm({ ...aggForm, raw_variable: e.target.value })}
    fullWidth
    helperText="Wpisz dokładną nazwę zmiennej finansowej"
  />
)}



    <FormControl fullWidth>
      <InputLabel>Typ agregacji</InputLabel>
      <Select
        value={aggForm.agg_type}
        label="Typ agregacji"
        onChange={(e) => setAggForm({ ...aggForm, agg_type: e.target.value })}
      >
        <MenuItem value="median">Mediana</MenuItem>
        <MenuItem value="mean">Średnia</MenuItem>
      </Select>
    </FormControl>
    <TextField
      label="Liczba lat"
      type="number"
      value={aggForm.agg_years}
      onChange={(e) => setAggForm({ ...aggForm, agg_years: parseInt(e.target.value) })}
      fullWidth
      helperText="Ile lat wstecz brać do obliczeń"
    />




    
    <FormControl fullWidth>
  <Select
    value={aggForm.category}  
    label="Kategoria (opcjonalnie)"
    onChange={(e) => setAggForm({ ...aggForm, category: e.target.value })}
    displayEmpty
  >
    <MenuItem value="">Użyj kategorii wskaźnika bazowego</MenuItem>
    {Array.from(new Set(indicators.filter(i => i.category).map(i => i.category!))).map(cat => (
      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
    ))}
  </Select>
</FormControl>
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setAggDialogOpen(false)}>Anuluj</Button>
    <Button
  variant="contained"
  onClick={handleAggSubmit}
  disabled={(aggForm.source_type || 'indicator') === 'indicator' ? !aggForm.base_indicator_id : !aggForm.raw_variable}
>
  Dodaj
</Button> 
  </DialogActions>
</Dialog>

      {/* Dialog dodawania zmiennej */}
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

<Dialog open={changeDialogOpen} onClose={() => setChangeDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Dodaj wskaźnik zmiany %</DialogTitle>
  <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
    <TextField
      label="Nazwa wyświetlana (opcjonalnie)"
      value={changeForm.display_name}
      onChange={(e) => setChangeForm({ ...changeForm, display_name: e.target.value })}
      fullWidth
      helperText="Zostaw puste aby wygenerować automatycznie"
    />
    <FormControl fullWidth>
      <InputLabel>Typ zmiany</InputLabel>
      <Select
        value={changeForm.change_type}
        label="Typ zmiany"
        onChange={(e) => setChangeForm({ ...changeForm, change_type: e.target.value })}
      >
        <MenuItem value="yoy">Rok do roku (YoY)</MenuItem>
        <MenuItem value="change_n">Zmiana na przestrzeni N lat</MenuItem>
      </Select>
    </FormControl>

    {changeForm.change_type === 'change_n' && (
      <TextField
        label="Liczba lat"
        type="number"
        value={changeForm.change_years}
        onChange={(e) => setChangeForm({ ...changeForm, change_years: parseInt(e.target.value) })}
        fullWidth
        helperText="Porównaj wartość z N lat temu"
      />
    )}

    <FormControl fullWidth>
      <InputLabel>Typ źródła</InputLabel>
      <Select
        value={changeForm.source_type}
        label="Typ źródła"
        onChange={(e) => setChangeForm({ ...changeForm, source_type: e.target.value, base_indicator_id: 0, raw_variable: '' })}
      >
        <MenuItem value="indicator">Wskaźnik (np. ROE, marża)</MenuItem>
        <MenuItem value="raw">Surowe dane (np. longterm_debt)</MenuItem>
      </Select>
    </FormControl>

    {changeForm.source_type === 'indicator' ? (
      <FormControl fullWidth>
        <InputLabel>Wskaźnik bazowy</InputLabel>
        <Select
          value={changeForm.base_indicator_id}
          label="Wskaźnik bazowy"
          onChange={(e) => setChangeForm({ ...changeForm, base_indicator_id: e.target.value as number })}
        >
          {Array.from(new Set(indicators.filter(i => !i.agg_type).map(i => i.category || 'Other'))).map(cat => [
            <MenuItem key={`cat-${cat}`} disabled sx={{ fontWeight: 'bold', color: 'text.primary', opacity: '1 !important', backgroundColor: '#f5f5f5' }}>
              {cat}
            </MenuItem>,
            ...indicators.filter(i => !i.agg_type && (i.category || 'Other') === cat).map(i => (
              <MenuItem key={i.id} value={i.id} sx={{ pl: 3 }}>
                {i.display_name}
              </MenuItem>
            ))
          ])}
        </Select>
      </FormControl>
    ) : (
      <TextField
        label="Nazwa zmiennej (np. longterm_debt)"
        value={changeForm.raw_variable}
        onChange={(e) => setChangeForm({ ...changeForm, raw_variable: e.target.value })}
        fullWidth
        helperText="Wpisz dokładną nazwę zmiennej finansowej"
      />
    )}

    <FormControl fullWidth>
      <InputLabel>Kategoria (opcjonalnie)</InputLabel>
      <Select
        value={changeForm.category}
        label="Kategoria (opcjonalnie)"
        onChange={(e) => setChangeForm({ ...changeForm, category: e.target.value })}
      >
        <MenuItem value="">Użyj kategorii wskaźnika bazowego</MenuItem>
        {Array.from(new Set(indicators.filter(i => i.category).map(i => i.category!))).map(cat => (
          <MenuItem key={cat} value={cat}>{cat}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </DialogContent>

<FormControlLabel
  control={
    <Switch
      checked={changeForm.is_percentage === 1}
      onChange={(e) => setChangeForm({ ...changeForm, is_percentage: e.target.checked ? 1 : 0 })}
    />
  }
  label="Wynik w procentach (wizualnie)"
/>


  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setChangeDialogOpen(false)}>Anuluj</Button>
    <Button
      variant="contained"
      onClick={handleChangeSubmit}
      disabled={changeForm.source_type === 'indicator' ? !changeForm.base_indicator_id : !changeForm.raw_variable}
    >
      Dodaj
    </Button>
  </DialogActions>
</Dialog>


    </Box>
  );
}