import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function Navbar() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <BarChartIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Financial Analyzer
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button color="inherit" component={Link} to="/">Kalkulator</Button>
          <Button color="inherit" component={Link} to="/companies">Spółki</Button>
          <Button color="inherit" component={Link} to="/indicators">Wskaźniki</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}