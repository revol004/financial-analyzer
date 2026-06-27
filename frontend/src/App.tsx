/**
 * Root component aplikacji Financial Analyzer
 * 
 * Odpowiadalna za:
 * - Tematem Material-UI
 * - Routingiem (React Router)
 * - Globalnym stanem mode (annual/quarterly)
 * - Strukturą aplikacji (Navbar + Routes)
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Indicators from './pages/Indicators';

// Material-UI tema - kolory, typography, spacing
const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },      // Niebieski - główny kolor
    secondary: { main: '#f57c00' },    // Pomarańczowy - akcenty
    background: { default: '#f5f5f5' } // Szary - tło
  },
});

/**
 * App Component
 * 
 * State:
 *   - mode: 'annual' | 'quarterly' - globalny tryb działa
 * 
 * Props: none
 * 
 * Struktura:
 * ThemeProvider
 *   └─ BrowserRouter
 *      ├─ Navbar (mode, onModeChange)
 *      └─ Routes
 *         ├─ / → Dashboard
 *         ├─ /companies → Companies
 *         └─ /indicators → Indicators
 */
export default function App() {
  // Globalny tryb: roczny (annual) lub kwartalny (quarterly)
  const [mode, setMode] = useState<'annual' | 'quarterly'>('annual');

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline normalizuje style CSS */}
      <CssBaseline />
      <BrowserRouter>
        {/* Navbar z przyciskiem toggle mode */}
        <Navbar mode={mode} onModeChange={setMode} />
        
        {/* Routes - każda ścieżka renderuje inny komponent */}
        <Routes>
          {/* / → Strona główna do obliczeń wskaźników */}
          <Route path="/" element={<Dashboard mode={mode} />} />
          
          {/* /companies → Zarządzanie spółkami */}
          <Route path="/companies" element={<Companies mode={mode} />} />
          
          {/* /indicators → Zarządzanie wskaźnikami i grupami */}
          <Route path="/indicators" element={<Indicators />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}