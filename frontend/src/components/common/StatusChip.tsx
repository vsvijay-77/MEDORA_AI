import React from 'react';
import { Chip, ChipProps } from '@mui/material';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: 'Verified' | 'Review' | 'Needs Confirmation' | 'NORMAL' | 'LOW' | 'HIGH' | 'Active' | string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, ...props }) => {
  let bgColor = '#F1F5F9';
  let textColor = '#475569';
  let borderColor = '#CBD5E1';

  switch (status) {
    case 'Verified':
    case 'NORMAL':
    case 'Active':
      bgColor = '#DCFCE7';
      textColor = '#166534';
      borderColor = '#BBF7D0';
      break;
    case 'Review':
    case 'LOW':
    case 'Needs Review':
      bgColor = '#FEF3C7';
      textColor = '#92400E';
      borderColor = '#FDE68A';
      break;
    case 'Needs Confirmation':
    case 'HIGH':
      bgColor = '#FEE2E2';
      textColor = '#991B1B';
      borderColor = '#FECACA';
      break;
  }

  return (
    <Chip
      label={status}
      size="small"
      variant="outlined"
      sx={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: borderColor,
        fontWeight: 600,
        fontSize: '0.75rem',
        ...props.sx,
      }}
      {...props}
    />
  );
};
