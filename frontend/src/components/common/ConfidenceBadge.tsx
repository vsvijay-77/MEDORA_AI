import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import ShieldCheckRoundedIcon from '@mui/icons-material/VerifiedRounded';

interface ConfidenceBadgeProps {
  score: number; // e.g. 94 or 0.94
  showBar?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, showBar = false }) => {
  const normalized = score > 1 ? score : Math.round(score * 100);
  
  let color = '#16A34A'; // Green for high
  if (normalized < 75) color = '#DC2626'; // Red for low
  else if (normalized < 85) color = '#F59E0B'; // Amber for medium

  return (
    <Tooltip title={`AI Confidence: ${normalized}%. Extracted against verified clinical reference documents.`}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1.5,
            bgcolor: `${color}14`,
            color: color,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          <ShieldCheckRoundedIcon sx={{ fontSize: 14 }} />
          <span>{normalized}% Confidence</span>
        </Box>
        {showBar && (
          <Box sx={{ width: 60 }}>
            <LinearProgress
              variant="determinate"
              value={normalized}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
