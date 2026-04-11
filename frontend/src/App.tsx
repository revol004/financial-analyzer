import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Indicators from './pages/Indicators';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    secondary: { main: '#f57c00' },
    background: { default: '#f5f5f5' },
  },
});

export default function App() {
  const [mode, setMode] = useState<'annual' | 'quarterly'>('annual');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Navbar mode={mode} onModeChange={setMode} />
        <Routes>
          <Route path="/" element={<Dashboard mode={mode} />} />
          <Route path="/companies" element={<Companies mode={mode} />} />
          <Route path="/indicators" element={<Indicators />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}