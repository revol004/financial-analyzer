/**
 * Navbar Component - Nawigacja i globalny selector trybu
 * 
 * Odpowiadalna za:
 * - Wyświetlanie menu nawigacyjnego
 * - Selektor trybu annual/quarterly
 * - Linki do głównych stron
 */
import { AppBar, Toolbar, Typography, Button, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Link } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';

interface Props {
  mode: 'annual' | 'quarterly';  // Obecny tryb
  onModeChange: (mode: 'annual' | 'quarterly') => void;  // Callback do zmiany trybu
}

/**
 * Navbar Component
 * 
 * Props:
 *   - mode: 'annual' | 'quarterly' - obecny tryb działa
 *   - onModeChange: callback gdy użytkownik zmieni tryb
 * 
 * Struktura:
 * AppBar
 *   └─ Toolbar
 *      ├─ Logo (Financial Analyzer)
 *      ├─ ToggleButtonGroup (Roczne / Kwartalne)
 *      └─ Linki nawigacyjne (Kalkulator, Spółki, Wskaźniki)
 */
export default function Navbar({ mode, onModeChange }: Props) {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        {/* Ikona wykresu + logo */}
        <BarChartIcon sx={{ mr: 1 }} />
        
        {/* Tytuł aplikacji - klikalne linki do home */}
        <Typography
          variant="h6"
          sx={{ fontWeight: 'bold', cursor: 'pointer', mr: 3, color: 'white', textDecoration: 'none' }}
          component={Link}
          to="/"
        >
          Financial Analyzer
        </Typography>

        {/* Selektor trybu: Annual (roczny) / Quarterly (kwartalny) */}
        {/* Wysyła nowy mode do App.tsx → Dashboard */}
        <ToggleButtonGroup
          value={mode}
          exclusive  // Tylko jeden przycisk może być active
          onChange={(_, val) => {
            if (val) {
              onModeChange(val);
            }
          }}
          size="small"
          sx={{ mr: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1 }}
        >
          {/* Opcja 1: Tryb roczny */}
          <ToggleButton value="annual" sx={{
            color: 'white',
            border: 'none',
            '&.Mui-selected': { backgroundColor: '#0d47a1', color: 'white' },
            '&.Mui-selected:hover': { backgroundColor: '#0a3d8f' },
          }}>
            Roczne
          </ToggleButton>
          
          {/* Opcja 2: Tryb kwartalny */}
          <ToggleButton value="quarterly" sx={{
            color: 'white',
            border: 'none',
            '&.Mui-selected': { backgroundColor: '#0d47a1', color: 'white' },
            '&.Mui-selected:hover': { backgroundColor: '#0a3d8f' },
          }}>
            Kwartalne
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Menu nawigacyjne - przesunięte w prawo (ml: 'auto') */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {/* Link do Dashboard (obliczenia wskaźników) */}
          <Button color="inherit" component={Link} to="/">
            Kalkulator
          </Button>
          
          {/* Link do Companies (zarządzanie spółkami) */}
          <Button color="inherit" component={Link} to="/companies">
            Spółki
          </Button>
          
          {/* Link do Indicators (zarządzanie wskaźnikami) */}
          <Button color="inherit" component={Link} to="/indicators">
            Wskaźniki
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}