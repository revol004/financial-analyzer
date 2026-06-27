import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Alert,
  Snackbar, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Tabs, Tab, Checkbox, FormGroup
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import BuildIcon from '@mui/icons-material/Build';
import { indicatorsApi } from '../services/api';
import { Autocomplete } from '@mui/material';
import ManageVariablesDialog from '../components/ManageVariablesDialog';
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
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const [groupFormDialogOpen, setGroupFormDialogOpen] = useState(false);
  const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', indicator_ids: [] as number[] });
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
   condition: '',
});
const [editAggDialogOpen, setEditAggDialogOpen] = useState(false);
const [editAggForm, setEditAggForm] = useState<any>(null);

const [editChangeDialogOpen, setEditChangeDialogOpen] = useState(false);
const [editChangeForm, setEditChangeForm] = useState<any>(null);
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

  const typeLabel = changeForm.change_type === 'yoy' ? 'YoY % Change' : `${changeForm.change_years}Y Change`;
  const sourceName = isRaw ? changeForm.raw_variable : base!.display_name;

  try {
    await indicatorsApi.create({
      name: `${changeForm.change_type}_${isRaw ? changeForm.raw_variable : base!.name}`,
      display_name: changeForm.display_name || `${sourceName} ${typeLabel}`,
      formula: isRaw ? changeForm.raw_variable : base!.formula,
      description: `${typeLabel} change of ${sourceName}`,
      category: changeForm.category || (isRaw ? '' : base?.category),
      is_percentage: changeForm.is_percentage,
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

const handleChangeEditSubmit = async () => {
  if (!editChangeForm) return;

  try {
    await indicatorsApi.update(editChangeForm.id, {
      display_name: editChangeForm.display_name,
      agg_type: editChangeForm.change_type,
      agg_years: editChangeForm.change_years,
      base_indicator_id: editChangeForm.base_indicator_id,
      category: editChangeForm.category,
      is_percentage: editChangeForm.is_percentage,
      formula: editChangeForm.formula,
    });

    setSnackbar({ open: true, message: 'Zmiana % zaktualizowana!', severity: 'success' });
    setEditChangeDialogOpen(false);
    fetchIndicators();

  } catch (err: any) {
  console.log(err);
  console.log(err?.response?.data);

  setSnackbar({
    open: true,
    message: JSON.stringify(err?.response?.data) || 'Błąd edycji',
    severity: 'error'
  });
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
  const [manageVariablesDialogOpen, setManageVariablesDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchIndicators = async () => {
    const res = await indicatorsApi.getAll();
    setIndicators(res.data);
  };

  const fetchGroups = async () => {
    try {
      const res = await indicatorsApi.getGroups();
      setGroups(res.data);
    } catch {
      // Grupy mogą nie być jeszcze dostępne
    }
  };

  useEffect(() => { 
    fetchIndicators(); 
    fetchGroups();
  }, []);

  const categories = ['all', ...Array.from(new Set(indicators.map(i => i.category || 'Other')))];
  const filteredIndicators = (categoryTab === 'all'
  ? indicators
  : indicators.filter(i => (i.category || 'Other') === categoryTab))
  .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const categoryOptions = Array.from(
  new Set(
    indicators
      .map(i => i.category)
      .filter((c): c is string => Boolean(c))
  )
);
  
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
      formula: aggForm.agg_type === 'count_if'
  ? (isRaw ? `${aggForm.raw_variable} ${aggForm.condition}` : aggForm.condition)
  : (isRaw ? aggForm.raw_variable : base!.formula),
      description: `${aggForm.agg_type === 'median' ? 'Median' : 'Mean'} of ${sourceName} over ${aggForm.agg_years} years`,
      category: aggForm.category || (isRaw ? '' : base!.category),
      is_percentage: aggForm.is_percentage,
      agg_type: aggForm.agg_type,
      agg_years: aggForm.agg_years,
      base_indicator_id: isRaw ? null : aggForm.base_indicator_id,
    });
    setSnackbar({ open: true, message: 'Wskaźnik agregowany dodany!', severity: 'success' });
    setAggDialogOpen(false);
    setAggForm({ display_name: '', agg_type: 'median', agg_years: 5, base_indicator_id: 0, source_type: 'indicator', raw_variable: '', category: '', is_percentage: 1, condition: '' });
    fetchIndicators();
  } catch {
    setSnackbar({ open: true, message: 'Błąd – wskaźnik już istnieje.', severity: 'error' });
  }
};

const handleAggEditSubmit = async () => {
  if (!editAggForm) return;

  try {
    await indicatorsApi.update(editAggForm.id, {
  display_name: editAggForm.display_name,
  agg_type: editAggForm.agg_type,
  agg_years: editAggForm.agg_years,
  base_indicator_id: editAggForm.base_indicator_id,
  category: editAggForm.category,
  is_percentage: editAggForm.is_percentage,
  formula: editAggForm.formula,
});

    setSnackbar({ open: true, message: 'Agregat zaktualizowany!', severity: 'success' });
    setEditAggDialogOpen(false);
    fetchIndicators();
  } catch {
    setSnackbar({ open: true, message: 'Błąd edycji agregatu', severity: 'error' });
  }
};

  const handleEditOpen = (indicator: Indicator) => {
  const handleEditOpen = (indicator: Indicator) => {
  // 🔵 AGGREGATY
  if (indicator.agg_type === 'median' || indicator.agg_type === 'mean') {
    setEditAggForm({
      id: indicator.id,
      display_name: indicator.display_name,
      agg_type: indicator.agg_type,
      agg_years: indicator.agg_years || 5,
      base_indicator_id: indicator.base_indicator_id || 0,
      category: indicator.category || '',
      is_percentage: indicator.is_percentage,
      formula: indicator.formula,
    });
    setEditAggDialogOpen(true);
    return;
  }

  // 🟢 ZMIANY %
  if (indicator.agg_type === 'yoy' || indicator.agg_type === 'change_n') {
    setEditChangeForm({
      id: indicator.id,
      display_name: indicator.display_name,
      change_type: indicator.agg_type === 'yoy' ? 'yoy' : 'change_n',
      change_years: indicator.agg_years || 5,
      base_indicator_id: indicator.base_indicator_id || 0,
      category: indicator.category || '',
      is_percentage: indicator.is_percentage,
      formula: indicator.formula,
    });
    setEditChangeDialogOpen(true);
    return;
  }

  // 🟡 NORMALNE (bez zmian)
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

  const handleGroupSubmit = async () => {
    if (!groupForm.name || groupForm.indicator_ids.length === 0) {
      setSnackbar({ open: true, message: 'Wpisz nazwę grupy i wybierz przynajmniej jeden wskaźnik!', severity: 'error' });
      return;
    }

    try {
      if (selectedGroupToEdit) {
        await indicatorsApi.updateGroup(selectedGroupToEdit.id, groupForm);
        setSnackbar({ open: true, message: 'Grupa zaktualizowana!', severity: 'success' });
      } else {
        await indicatorsApi.createGroup(groupForm);
        setSnackbar({ open: true, message: 'Grupa dodana!', severity: 'success' });
      }
      setGroupFormDialogOpen(false);
      setGroupForm({ name: '', description: '', indicator_ids: [] });
      setSelectedGroupToEdit(null);
      fetchGroups();
    } catch {
      setSnackbar({ open: true, message: 'Błąd – nazwa grupy już istnieje.', severity: 'error' });
    }
  };

  const handleGroupEdit = (group: any) => {
    setSelectedGroupToEdit(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      indicator_ids: group.indicator_ids || []
    });
    setGroupFormDialogOpen(true);
  };

  const handleGroupDelete = async (groupId: number) => {
    if (!window.confirm('Usunąć tę grupę?')) return;
    try {
      await indicatorsApi.deleteGroup(groupId);
      setSnackbar({ open: true, message: 'Grupa usunięta!', severity: 'success' });
      fetchGroups();
    } catch {
      setSnackbar({ open: true, message: 'Błąd usuwania grupy.', severity: 'error' });
    }
  };

  const handleGroupIndicatorToggle = (indicatorId: number) => {
    const newIds = groupForm.indicator_ids.includes(indicatorId)
      ? groupForm.indicator_ids.filter(id => id !== indicatorId)
      : [...groupForm.indicator_ids, indicatorId];
    setGroupForm({ ...groupForm, indicator_ids: newIds });
  };

  const getGroupIndicatorNames = (indicatorIds: number[]) => {
    return indicatorIds
      .map(id => indicators.find(i => i.id === id)?.display_name)
      .filter(Boolean)
      .join(', ');
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
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setGroupsDialogOpen(true)}>
            Grupy wskaźników
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAggDialogOpen(true)}>
            Dodaj agregat
          </Button>
<Button variant="outlined" startIcon={<AddIcon />} onClick={() => setChangeDialogOpen(true)}>
  Dodaj zmianę %
</Button>
          <Button variant="outlined" startIcon={<BuildIcon />} onClick={() => setManageVariablesDialogOpen(true)}>
            Zarządzaj zmiennymi
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
           <Autocomplete
  freeSolo
  options={categoryOptions}
  value={form.category}
  onChange={(_, value) =>
    setForm({ ...form, category: value || '' })
  }
  onInputChange={(_, value) =>
    setForm({ ...form, category: value })
  }
  sx={{ flex: 1 }}
  renderInput={(params) => (
    <TextField {...params} label="Kategoria" fullWidth />
  )}
/>
            <FormControl sx={{ flex: 1 }}>
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
            <Autocomplete
  freeSolo
  options={categoryOptions}
  value={editForm.category}
  onChange={(_, value) =>
    setEditForm({ ...editForm, category: value || '' })
  }
  onInputChange={(_, value) =>
    setEditForm({ ...editForm, category: value })
  }
  sx={{ flex: 1 }}
  renderInput={(params) => (
    <TextField {...params} label="Kategoria" fullWidth />
  )}
/>
            <FormControl sx={{ flex: 1 }}>
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
      {Array.from(new Set(indicators.map(i => i.category || 'Other'))).map(cat => [
  <MenuItem key={`cat-${cat}`} disabled sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
    {cat}
  </MenuItem>,
  ...indicators
    .filter((i: Indicator) =>
      (!i.agg_type || i.agg_type === 'yoy' || i.agg_type === 'change_n') &&
      (i.category || 'Other') === cat
    )
    .map((i: Indicator) => (
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
    <MenuItem value="count_if">Licznik warunkowy (ile lat spełnia warunek)</MenuItem>
  </Select>
</FormControl>

{aggForm.agg_type === 'count_if' && (
  <TextField
    label="Warunek (np. > 0 lub < 0.1 lub >= 0.05)"
    value={aggForm.condition || ''}
    onChange={(e) => setAggForm({ ...aggForm, condition: e.target.value })}
    fullWidth
    helperText="Wpisz operator i wartość np. '> 0' oznacza 'wartość większa niż 0'"
  />
)}
    <TextField
      label="Liczba lat"
      type="number"
      value={aggForm.agg_years}
      onChange={(e) => setAggForm({ ...aggForm, agg_years: parseInt(e.target.value) })}
      fullWidth
      helperText="Ile lat wstecz brać do obliczeń"
    />

    
   <Autocomplete
  freeSolo
  options={Array.from(new Set(indicators.map(i => i.category).filter(Boolean)))}
  value={aggForm.category}
  onChange={(_, value) =>
    setAggForm({ ...aggForm, category: value || '' })
  }
  onInputChange={(_, value) =>
    setAggForm({ ...aggForm, category: value })
  }
  renderInput={(params) => (
    <TextField {...params} label="Kategoria (opcjonalnie)" />
  )}
/>

<FormControlLabel
  control={
    <Switch
      checked={aggForm.is_percentage === 1}
      onChange={(e) => setAggForm({ ...aggForm, is_percentage: e.target.checked ? 1 : 0 })}
    />
  }
  label="Wynik w procentach (wizualnie)"
/>

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


      {/* Dialog dodawania zmiennej zmiany % */}
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
          {Array.from(new Set(indicators.filter(i => !i.agg_type || i.agg_type === 'yoy' || i.agg_type === 'change_n').map(i => i.category || 'Other'))).map(cat => [
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

    <Autocomplete
  freeSolo
  options={Array.from(new Set(indicators.map(i => i.category).filter(Boolean)))}
  value={changeForm.category}
  onChange={(_, value) =>
    setChangeForm({ ...changeForm, category: value || '' })
  }
  onInputChange={(_, value) =>
    setChangeForm({ ...changeForm, category: value })
  }
  renderInput={(params) => (
    <TextField {...params} label="Kategoria (opcjonalnie)" />
  )}
/>

<FormControlLabel
  control={
    <Switch
      checked={changeForm.is_percentage === 1}
      onChange={(e) => setChangeForm({ ...changeForm, is_percentage: e.target.checked ? 1 : 0 })}
    />
  }
  label="Wynik w procentach (wizualnie)"
/>

  </DialogContent>




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

      {/* Dialog edycji agregatu */}
      <Dialog open={editAggDialogOpen} onClose={() => setEditAggDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edytuj wskaźnik agregowany – {editAggForm?.display_name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nazwa wyświetlana"
            value={editAggForm?.display_name || ''}
            onChange={(e) => setEditAggForm({ ...editAggForm, display_name: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Typ agregacji</InputLabel>
            <Select
              value={editAggForm?.agg_type || 'median'}
              label="Typ agregacji"
              onChange={(e) => setEditAggForm({ ...editAggForm, agg_type: e.target.value })}
            >
              <MenuItem value="median">Mediana</MenuItem>
              <MenuItem value="mean">Średnia</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Liczba lat"
            type="number"
            value={editAggForm?.agg_years || 5}
            onChange={(e) => setEditAggForm({ ...editAggForm, agg_years: parseInt(e.target.value) })}
            fullWidth
          />
          <Autocomplete
            freeSolo
            options={Array.from(new Set(indicators.map(i => i.category).filter(Boolean)))}
            value={editAggForm?.category || ''}
            onChange={(_, value) =>
              setEditAggForm({ ...editAggForm, category: value || '' })
            }
            onInputChange={(_, value) =>
              setEditAggForm({ ...editAggForm, category: value })
            }
            renderInput={(params) => (
              <TextField {...params} label="Kategoria (opcjonalnie)" />
            )}
          />
          <FormControlLabel
            control={
              <Switch
                checked={(editAggForm?.is_percentage || 0) === 1}
                onChange={(e) => setEditAggForm({ ...editAggForm, is_percentage: e.target.checked ? 1 : 0 })}
              />
            }
            label="Wynik w procentach (wizualnie)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditAggDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleAggEditSubmit}>
            Zapisz zmiany
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog edycji zmiany % */}
      <Dialog open={editChangeDialogOpen} onClose={() => setEditChangeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edytuj wskaźnik zmiany % – {editChangeForm?.display_name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nazwa wyświetlana"
            value={editChangeForm?.display_name || ''}
            onChange={(e) => setEditChangeForm({ ...editChangeForm, display_name: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Typ zmiany</InputLabel>
            <Select
              value={editChangeForm?.change_type || 'yoy'}
              label="Typ zmiany"
              onChange={(e) => setEditChangeForm({ ...editChangeForm, change_type: e.target.value })}
            >
              <MenuItem value="yoy">Rok do roku (YoY)</MenuItem>
              <MenuItem value="change_n">Zmiana na przestrzeni N lat</MenuItem>
            </Select>
          </FormControl>
          {editChangeForm?.change_type === 'change_n' && (
            <TextField
              label="Liczba lat"
              type="number"
              value={editChangeForm?.change_years || 5}
              onChange={(e) => setEditChangeForm({ ...editChangeForm, change_years: parseInt(e.target.value) })}
              fullWidth
            />
          )}
          <Autocomplete
            freeSolo
            options={Array.from(new Set(indicators.map(i => i.category).filter(Boolean)))}
            value={editChangeForm?.category || ''}
            onChange={(_, value) =>
              setEditChangeForm({ ...editChangeForm, category: value || '' })
            }
            onInputChange={(_, value) =>
              setEditChangeForm({ ...editChangeForm, category: value })
            }
            renderInput={(params) => (
              <TextField {...params} label="Kategoria (opcjonalnie)" />
            )}
          />
          <FormControlLabel
            control={
              <Switch
                checked={(editChangeForm?.is_percentage || 0) === 1}
                onChange={(e) => setEditChangeForm({ ...editChangeForm, is_percentage: e.target.checked ? 1 : 0 })}
              />
            }
            label="Wynik w procentach (wizualnie)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditChangeDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleChangeEditSubmit}>
            Zapisz zmiany
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

      {/* Dialog zarządzania zmiennymi */}
      <ManageVariablesDialog
        open={manageVariablesDialogOpen}
        onClose={() => setManageVariablesDialogOpen(false)}
      />

      {/* Dialog zarządzania grupami wskaźników */}
      <Dialog open={groupsDialogOpen} onClose={() => setGroupsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grupy wskaźników</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            fullWidth 
            sx={{ mb: 2 }}
            onClick={() => {
              setSelectedGroupToEdit(null);
              setGroupForm({ name: '', description: '', indicator_ids: [] });
              setGroupFormDialogOpen(true);
            }}
          >
            Dodaj nową grupę
          </Button>

          {groups.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              Brak grup. Utwórz pierwszą grupę.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nazwa</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Wskaźniki</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Akcje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id} hover>
                      <TableCell><strong>{group.name}</strong></TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        {getGroupIndicatorNames(group.indicator_ids)}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edytuj grupę">
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => handleGroupEdit(group)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Usuń grupę">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleGroupDelete(group.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGroupsDialogOpen(false)}>Zamknij</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tworzenia/edycji grupy */}
      <Dialog open={groupFormDialogOpen} onClose={() => setGroupFormDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedGroupToEdit ? `Edytuj grupę – ${selectedGroupToEdit.name}` : 'Dodaj nową grupę wskaźników'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nazwa grupy"
            value={groupForm.name}
            onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Opis (opcjonalnie)"
            value={groupForm.description}
            onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Wybierz wskaźniki do grupy:
            </Typography>
            <FormGroup sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e0e0e0', p: 1 }}>
              {indicators.map((indicator) => (
                <FormControlLabel
                  key={indicator.id}
                  control={
                    <Checkbox
                      checked={groupForm.indicator_ids.includes(indicator.id)}
                      onChange={() => handleGroupIndicatorToggle(indicator.id)}
                    />
                  }
                  label={`${indicator.display_name} (${indicator.category || 'Inne'})`}
                />
              ))}
            </FormGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Wybrano: {groupForm.indicator_ids.length} wskaźnik(ów)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => {
            setGroupFormDialogOpen(false);
            setSelectedGroupToEdit(null);
          }}>
            Anuluj
          </Button>
          <Button 
            variant="contained" 
            onClick={handleGroupSubmit}
            disabled={!groupForm.name || groupForm.indicator_ids.length === 0}
          >
            {selectedGroupToEdit ? 'Zapisz zmiany' : 'Dodaj grupę'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}