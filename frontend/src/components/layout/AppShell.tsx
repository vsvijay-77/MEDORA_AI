import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/records': 'Medical Records Repository',
  '/upload': 'Upload Medical Document',
  '/timeline': 'Health Event Timeline',
  '/copilot': 'AI Health Copilot',
  '/trends': 'Lab Trends & Analytics',
  '/medications': 'Active Medications & Prescriptions',
  '/fhir': 'FHIR & ABDM Interoperability',
  '/profile': 'Personal Health Profile',
  '/settings': 'Security & System Settings',
};

export const AppShell: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/records/')) return 'Document Details & Verification';
    return TITLE_MAP[location.pathname] || 'MEDORA AI Workspace';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          bgcolor: '#F8FAFC',
        }}
      >
        <Header
          onToggleSidebar={() => {
            if (isMobile) setMobileOpen(!mobileOpen);
            else setCollapsed(!collapsed);
          }}
          title={getPageTitle()}
        />

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flexGrow: 1, maxWidth: 1400, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
