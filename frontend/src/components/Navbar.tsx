import { AppBar, Toolbar, Typography, Button, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';

interface Props {
  mode: 'annual' | 'quarterly';
  onModeChange: (mode: 'annual' | 'quarterly') => void;
}

export default function Navbar({ mode, onModeChange }: Props) {
  

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <BarChartIcon sx={{ mr: 1 }} />
       <Typography
  variant="h6"
  sx={{ fontWeight: 'bold', cursor: 'pointer', mr: 3, color: 'white', textDecoration: 'none' }}
  component={Link}
  to="/"
>
  Financial Analyzer
</Typography>

        <ToggleButtonGroup
  value={mode}
  exclusive
  onChange={(_, val) => val && onModeChange(val)}
  size="small"
  sx={{ mr: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1 }}
>
  <ToggleButton value="annual" sx={{
    color: 'white',
    border: 'none',
    '&.Mui-selected': { backgroundColor: '#0d47a1', color: 'white' },
    '&.Mui-selected:hover': { backgroundColor: '#0a3d8f' },
  }}>
    Roczne
  </ToggleButton>
  <ToggleButton value="quarterly" sx={{
    color: 'white',
    border: 'none',
    '&.Mui-selected': { backgroundColor: '#0d47a1', color: 'white' },
    '&.Mui-selected:hover': { backgroundColor: '#0a3d8f' },
  }}>
    Kwartalne
  </ToggleButton>
</ToggleButtonGroup>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button color="inherit" component={Link} to="/">Kalkulator</Button>
          <Button color="inherit" component={Link} to="/companies">Spółki</Button>
          <Button color="inherit" component={Link} to="/indicators">Wskaźniki</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}