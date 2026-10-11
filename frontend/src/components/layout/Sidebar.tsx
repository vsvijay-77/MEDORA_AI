import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import { useAuth } from '../../contexts/AuthContext';

// AI Health Copilot is prioritized second, Upload Document removed as dedicated nav item (integrated in Copilot)
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'AI Health Copilot', path: '/copilot', icon: <AutoAwesomeRoundedIcon /> },
  { label: 'Medical Records', path: '/records', icon: <FolderSharedRoundedIcon /> },
  { label: 'Health Timeline', path: '/timeline', icon: <TimelineRoundedIcon /> },
  { label: 'Lab Trends', path: '/trends', icon: <BiotechRoundedIcon /> },
  { label: 'Medications', path: '/medications', icon: <MedicationRoundedIcon /> },
  { label: 'FHIR / ABDM', path: '/fhir', icon: <DataObjectRoundedIcon /> },
  { label: 'Profile', path: '/profile', icon: <PersonRoundedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsRoundedIcon /> },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawerWidth = collapsed ? 76 : 256;

  const content = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: 'primary.main',
              color: '#FFFFFF',
              width: 38,
              height: 38,
              borderRadius: 2,
            }}
          >
            <LocalHospitalRoundedIcon sx={{ fontSize: 22 }} />
          </Avatar>
          {!collapsed && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1, color: '#0F172A', fontSize: '1.1rem' }}>
                MEDORA AI
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem' }}>
                Health Copilot
              </Typography>
            </Box>
          )}
        </Box>
        {!isMobile && !collapsed && (
          <IconButton size="small" onClick={onToggleCollapse} sx={{ color: 'text.secondary' }}>
            <ChevronLeftRoundedIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Nav List */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNav(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  bgcolor: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    bgcolor: isActive ? '#DBEAFE' : '#F8FAFC',
                  },
                  '&.Mui-selected': {
                    bgcolor: '#EFF6FF',
                    color: 'primary.main',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#DBEAFE' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 36,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Bottom Actions */}
      <List sx={{ px: 1.5, py: 1.5 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => window.open('https://abdm.gov.in', '_blank')}
            sx={{
              borderRadius: 2,
              py: 0.8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'text.secondary',
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'text.secondary', justifyContent: 'center' }}>
              <HelpOutlineRoundedIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Help & ABDM Specs" primaryTypographyProps={{ fontSize: '0.875rem' }} />}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 0.8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'error.main',
              '&:hover': { bgcolor: '#FEE2E2' },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'error.main', justifyContent: 'center' }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 260,
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Box
      component="nav"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.2s ease',
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            transition: 'width 0.2s ease',
            borderRight: '1px solid #E2E8F0',
          },
        }}
        open
      >
        {content}
      </Drawer>
    </Box>
  );
};
