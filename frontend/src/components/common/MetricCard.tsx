import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = '#2563EB',
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: `${color}14`,
              color: color,
              width: 44,
              height: 44,
              borderRadius: 2.5,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        <Typography variant="h3" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
          {value}
        </Typography>
        {trend && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
