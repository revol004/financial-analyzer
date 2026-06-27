import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Chip, Box, Typography, Paper, Autocomplete, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { financialsApi } from '../services/api'; // Import Twojego API

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: number; // Opcjonalne ID spółki pomocne przy skanowaniu bazy
}

const COMMON_VARIABLES = (() => {
  const saved = localStorage.getItem('defaultVariables');
  return saved ? JSON.parse(saved) : [
    'revenue', 'net_income', 'operating_income', 'equity',
    'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities'
  ];
})();

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  'Income Statement': ['revenue', 'net_income', 'operating_income', 'gross_profit', 'ebitda'],
  'Balance Sheet': ['total_assets', 'current_assets', 'equity', 'total_liabilities', 'current_liabilities', 'longterm_debt'],
  'Cash Flow': ['operating_cash_flow', 'capex', 'free_cash_flow'],
};

const getVariableCategories = (): Record<string, string> => {
  const saved = localStorage.getItem('variableCategories');
  return saved ? JSON.parse(saved) : {};
};

const saveVariableCategories = (cats: Record<string, string>) => {
  localStorage.setItem('variableCategories', JSON.stringify(cats));
};

const getCustomCategories = (): string[] => {
  const saved = localStorage.getItem('customVariableCategories');
  return saved ? JSON.parse(saved) : [];
};

const saveCustomCategories = (cats: string[]) => {
  localStorage.setItem('customVariableCategories', JSON.stringify(cats));
};

export default function ManageVariablesDialog({ open, onClose, companyId }: Props) {
  const [variables, setVariables] = useState<string[]>(COMMON_VARIABLES);
  const [newVariable, setNewVariable] = useState('');
  const [newVariableCategory, setNewVariableCategory] = useState('');
  const [variableCategories, setVariableCategories] = useState<Record<string, string>>(getVariableCategories);
  const [customCategories, setCustomCategories] = useState<string[]>(getCustomCategories);
  const [categoryTab, setCategoryTab] = useState<string>('all');
  const [mappingMode, setMappingMode] = useState<'list' | 'table'>('list');
  const [localVariableCategories, setLocalVariableCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false); // Stan blokady podczas usuwania z MySQL

  // Synchronizacja zmiennych z bazy danych i localStorage przy otwarciu
  useEffect(() => {
    const fetchAllVariables = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const saved = localStorage.getItem('defaultVariables');
        const localVars = saved ? JSON.parse(saved) : COMMON_VARIABLES;
        const allVarsSet = new Set<string>(localVars);

        // Wyciągamy nazwy zmiennych zapisane w bazie danych dla przykładowego ID (lub przekazanego propsu)
        const targetCompanyId = companyId || 1; 
        
        const [resAnnual, resQ1, resQ2, resQ3, resQ4] = await Promise.all([
          financialsApi.getByCompany(targetCompanyId),
          financialsApi.getByCompany(targetCompanyId, 1),
          financialsApi.getByCompany(targetCompanyId, 2),
          financialsApi.getByCompany(targetCompanyId, 3),
          financialsApi.getByCompany(targetCompanyId, 4),
        ]).catch(() => [null, null, null, null, null]); // Zabezpieczenie przed wywrotką zapytania

        const dataSources = [resAnnual?.data, resQ1?.data, resQ2?.data, resQ3?.data, resQ4?.data];

        dataSources.forEach(source => {
          if (source) {
            Object.values(source).forEach((yearData: any) => {
              Object.keys(yearData).forEach((v: string) => {
                if (v !== "quarter") allVarsSet.add(v); // Ignorujemy ewentualne śmieciowe dane
              });
            });
          }
        });

        const mergedVariables = Array.from(allVarsSet);
        setVariables(mergedVariables);
        localStorage.setItem('defaultVariables', JSON.stringify(mergedVariables));

      } catch (error) {
        console.error("Błąd pobierania struktury zmiennych z bazy:", error);
      } finally {
        setVariableCategories(getVariableCategories());
        setCustomCategories(getCustomCategories());
        setLoading(false);
      }
    };

    fetchAllVariables();
  }, [open, companyId]);

  const getCategoryForVariable = (variable: string): string => {
    if (variableCategories[variable]) return variableCategories[variable];
    for (const [cat, vars] of Object.entries(DEFAULT_CATEGORIES)) {
      if (vars.includes(variable)) return cat;
    }
    return 'Other';
  };

  const allCategories: string[] = [
    'all',
    ...Array.from(new Set([...variables.map(v => getCategoryForVariable(v)), ...customCategories]))
  ];

  const filteredVariables: string[] =
    categoryTab === 'all'
      ? [...variables].sort()
      : [...variables]
          .filter(v => getCategoryForVariable(v) === categoryTab)
          .sort();

  const handleAddVariable = () => {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      const updated = [...variables, v];
      setVariables(updated);
      localStorage.setItem('defaultVariables', JSON.stringify(updated));

      if (newVariableCategory.trim()) {
        const updated_cats = { ...variableCategories, [v]: newVariableCategory };
        setVariableCategories(updated_cats);
        saveVariableCategories(updated_cats);

        if (!allCategories.includes(newVariableCategory)) {
          const updated_custom = [...customCategories, newVariableCategory];
          setCustomCategories(updated_custom);
          saveCustomCategories(updated_custom);
        }
      }

      setNewVariable('');
      setNewVariableCategory('');
    }
  };

  // AKCJA REALNEGO USUWANIA Z BAZY DANYCH I Z LOCALSTORAGE
  const handleDeleteVariable = async (variable: string) => {
    const isConfirmed = window.confirm(
      `⚠️ UWAGA!!! Czy na pewno chcesz usunąć zmienną "${variable}"?\n\n` +
      `Ta operacja BEZPOWROTNIE USUNIE wszystkie wpisy i wartości tej zmiennej dla WSZYSTKICH spółek w bazie danych MySQL!`
    );
    
    if (!isConfirmed) return;

    setDeleting(true);
    try {
      // 1. Usunięcie z bazy danych przy pomocy Twojego FastAPI
      const response = await financialsApi.deleteVariable(variable);
      console.log(response.data?.message);

      // 2. Usunięcie z lokalnego stanu widoku i pamięci podręcznej przeglądarki
      const updatedVars = variables.filter(v => v !== variable);
      setVariables(updatedVars);
      localStorage.setItem('defaultVariables', JSON.stringify(updatedVars));

      // 3. Czyszczenie powiązań z kategoriami
      const updatedCats = { ...variableCategories };
      delete updatedCats[variable];
      setVariableCategories(updatedCats);
      saveVariableCategories(updatedCats);

      alert(`Zmienna "${variable}" została trwale usunięta z bazy danych oraz ustawień lokalnych.`);
    } catch (error) {
      console.error("Błąd podczas usuwania zmiennej z FastAPI:", error);
      alert("Wystąpił błąd serwera. Nie udało się trwale usunąć zmiennej z bazy MySQL.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenMappingMode = () => {
    setLocalVariableCategories({ ...variableCategories });
    setMappingMode('table');
  };

  const handleUpdateVariableCategory = (variable: string, category: string) => {
    setLocalVariableCategories({
      ...localVariableCategories,
      [variable]: category
    });
  };

  const handleSaveVariableMapping = () => {
    setVariableCategories(localVariableCategories);
    saveVariableCategories(localVariableCategories);
    setMappingMode('list');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Zarządzaj zmiennymi finansowymi</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {loading || deleting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, flexDirection: 'column', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {deleting ? "Trwa usuwanie rekordów z bazy danych MySQL..." : "Skanowanie struktur bazy danych..."}
            </Typography>
          </Box>
        ) : mappingMode === 'list' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Te zmienne reprezentują kolumny w bazie danych. Usunięcie zmiennej spowoduje skasowanie jej wartości u wszystkich podmiotów.
            </Typography>

            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Dodaj nową zmienną
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                  label="Nazwa zmiennej (np. ebitda)"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Używaj małych liter i podkreśleń zamiast spacji"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
                />
                <Autocomplete
                  freeSolo
                  options={allCategories.filter(c => c !== 'all')}
                  value={newVariableCategory}
                  onChange={(_, value) => setNewVariableCategory(value || '')}
                  onInputChange={(_, value) => setNewVariableCategory(value)}
                  size="small"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kategoria (opcjonalnie)"
                      placeholder="np. Income Statement, Raw Data"
                    />
                  )}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddVariable}
                  disabled={!newVariable}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Dodaj zmienną
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Dostępne zmienne ({variables.length})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenMappingMode}
                >
                  Zmapuj wszystkie
                </Button>
              </Box>

              {allCategories.length > 1 && (
                <Tabs
                  value={categoryTab}
                  onChange={(_, v) => setCategoryTab(v)}
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {allCategories.map(cat => (
                    <Tab key={cat} label={cat === 'all' ? 'All' : cat} value={cat} />
                  ))}
                </Tabs>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filteredVariables.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Brak zmiennych w tej kategorii
                  </Typography>
                ) : (
                  filteredVariables.map(variable => (
                    <Chip
                      key={variable}
                      label={variable}
                      onDelete={() => handleDeleteVariable(variable)}
                      deleteIcon={<DeleteIcon />}
                      disabled={deleting}
                      sx={{ fontFamily: 'monospace' }}
                      variant="outlined"
                    />
                  ))
                )}
              </Box>
            </Paper>
          </>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
              Zmapuj zmienne na kategorie
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Zmienna</strong></TableCell>
                    <TableCell><strong>Kategoria</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variables.sort().map((variable: string) => (
                    <TableRow key={variable} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{variable}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={allCategories.filter(c => c !== 'all')}
                          value={localVariableCategories[variable] || getCategoryForVariable(variable)}
                          onChange={(_, value) => handleUpdateVariableCategory(variable, value || '')}
                          onInputChange={(_, value) => handleUpdateVariableCategory(variable, value)}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Wybierz kategorię" />
                          )}
                          sx={{ width: '100%' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {mappingMode === 'table' ? (
          <>
            <Button onClick={() => setMappingMode('list')}>Anuluj</Button>
            <Button variant="contained" onClick={handleSaveVariableMapping}>
              Zapisz mapowanie
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Zamknij</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}