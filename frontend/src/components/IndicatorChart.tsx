import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import { useState } from 'react';

interface Props {
  results: any;
  indicators: { id: number; display_name: string }[];
  years: number[];
}

const COLORS = ['#1565c0', '#f57c00', '#2e7d32', '#c62828', '#6a1b9a', '#00838f'];

export default function IndicatorChart({ results, indicators, years }: Props) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const sortedYears = [...years].sort((a, b) => a - b);

  // Przekształć dane do formatu Recharts
  const data = sortedYears.map(year => {
    const point: any = { year: year.toString() };
    indicators.forEach(ind => {
      const val = results[year]?.[ind.display_name];
      point[ind.display_name] = val !== null && val !== undefined
        ? parseFloat((val * 100).toFixed(2))
        : null;
    });
    return point;
  });

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Wykres wskaźników</Typography>
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

      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            {indicators.map((ind, i) => (
              <Line
                key={ind.id}
                type="monotone"
                dataKey={ind.display_name}
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
            {indicators.map((ind, i) => (
              <Bar
                key={ind.id}
                dataKey={ind.display_name}
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