import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Alert,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

const TREND_DATA: Record<string, {
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  data: { date: string; value: number }[];
  summary: string;
}> = {
  glucose: {
    name: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    normalMin: 70,
    normalMax: 99,
    data: [
      { date: '15 Jul 2026', value: 168 },
      { date: '15 Aug 2026', value: 158 },
      { date: '22 Sep 2026', value: 150 },
      { date: '10 Oct 2026', value: 142 },
    ],
    summary:
      'Fasting glucose has steadily decreased from 168 mg/dL to 142 mg/dL across your last 4 visits, showing positive response to Metformin 500mg BD. However, it remains above the normal range of 70–99 mg/dL.',
  },
  hemoglobin: {
    name: 'Hemoglobin (Hb)',
    unit: 'g/dL',
    normalMin: 12.0,
    normalMax: 16.0,
    data: [
      { date: '15 Jul 2026', value: 11.4 },
      { date: '15 Aug 2026', value: 11.0 },
      { date: '22 Sep 2026', value: 10.6 },
      { date: '10 Oct 2026', value: 10.2 },
    ],
    summary:
      'Hemoglobin levels have slightly trended downward over the last 3 months to 10.2 g/dL, which is below the standard reference range (12.0–16.0 g/dL). Discuss potential iron or dietary evaluation with your clinician.',
  },
  creatinine: {
    name: 'Serum Creatinine',
    unit: 'mg/dL',
    normalMin: 0.6,
    normalMax: 1.2,
    data: [
      { date: '15 Jul 2026', value: 0.85 },
      { date: '15 Aug 2026', value: 0.88 },
      { date: '22 Sep 2026', value: 0.91 },
      { date: '10 Oct 2026', value: 0.90 },
    ],
    summary:
      'Serum Creatinine remains very stable within normal reference parameters (0.6–1.2 mg/dL), indicating well-maintained renal function.',
  },
};

export const TrendsPage: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('glucose');
  const metric = TREND_DATA[selectedMetric];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Lab Trends & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Continuous biometric trend analysis synthesized across repeated pathology visits.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Select Biomarker</InputLabel>
          <Select
            value={selectedMetric}
            label="Select Biomarker"
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <MenuItem value="glucose">Fasting Blood Glucose</MenuItem>
            <MenuItem value="hemoglobin">Hemoglobin (Hb)</MenuItem>
            <MenuItem value="creatinine">Serum Creatinine</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Main Chart Card */}
      <Card sx={{ p: 2 }}>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h4" fontWeight={600}>
                {metric.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Standard Reference Range: {metric.normalMin} – {metric.normalMax} {metric.unit}
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {metric.data[metric.data.length - 1].value}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                {metric.unit} (Latest)
              </Typography>
            </Typography>
          </Box>

          {/* Interactive Recharts Line Chart */}
          <Box sx={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metric.data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  domain={[
                    Math.floor(Math.min(...metric.data.map((d) => d.value), metric.normalMin) * 0.85),
                    Math.ceil(Math.max(...metric.data.map((d) => d.value), metric.normalMax) * 1.15),
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Box
                          sx={{
                            bgcolor: '#FFFFFF',
                            p: 1.5,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {payload[0].payload.date}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                            {payload[0].value} {metric.unit}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                {/* Normal range shaded area */}
                <ReferenceArea
                  y1={metric.normalMin}
                  y2={metric.normalMax}
                  fill="#DCFCE7"
                  fillOpacity={0.4}
                />
                <ReferenceLine y={metric.normalMax} stroke="#16A34A" strokeDasharray="3 3" />
                <ReferenceLine y={metric.normalMin} stroke="#16A34A" strokeDasharray="3 3" />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Factual AI Summary */}
      <Card sx={{ bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AutoAwesomeRoundedIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700} color="primary.dark">
              Clinical Trajectory Insights
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: '#1E3A8A', lineHeight: 1.6 }}>
            {metric.summary}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
