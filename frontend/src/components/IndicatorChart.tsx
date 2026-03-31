import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useState } from 'react';

interface Company { id: number; name: string; ticker: string; }

interface Props {
  results: Record<number, any>;
  indicators: { id: number; display_name: string }[];
  years: number[];
  companies: Company[];
}

const COLORS = ['#1565c0', '#f57c00', '#2e7d32', '#c62828', '#6a1b9a', '#00838f'];

export default function IndicatorChart({ results, indicators, years, companies }: Props) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [selectedIndicator, setSelectedIndicator] = useState<string>(indicators[0]?.display_name || '');

  const sortedYears = [...years].sort((a, b) => a - b);

  const data = sortedYears.map(year => {
    const point: any = { year: year.toString() };
    companies.forEach(company => {
      const val = results[company.id]?.[year]?.[selectedIndicator];
      point[company.ticker] = val !== null && val !== undefined
        ? parseFloat((val * 100).toFixed(2))
        : null;
    });
    return point;
  });

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6">Wykres porównawczy</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Wskaźnik</InputLabel>
            <Select
              value={selectedIndicator}
              label="Wskaźnik"
              onChange={(e) => setSelectedIndicator(e.target.value)}
            >
              {indicators.map(ind => (
                <MenuItem key={ind.id} value={ind.display_name}>{ind.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, val) => val && setChartType(val)}
            size="small"
          >
            <ToggleButton value="line">Liniowy</ToggleButton>
            <ToggleButton value="bar">Słupkowy</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            {companies.map((company, i) => (
              <Line
                key={company.id}
                type="monotone"
                dataKey={company.ticker}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            {companies.map((company, i) => (
              <Bar
                key={company.id}
                dataKey={company.ticker}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </Paper>
  );
}