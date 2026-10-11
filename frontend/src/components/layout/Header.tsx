import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  InputBase,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Select,
  FormControl,
  alpha,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_LANGUAGES } from '../../types/languages';

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { patient, logout, updatePatient } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [language, setLanguage] = useState(patient?.preferred_language || 'English');

  useEffect(() => {
    if (patient?.preferred_language) {
      setLanguage(patient.preferred_language);
    }
  }, [patient?.preferred_language]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        color: '#0F172A',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onToggleSidebar}
            sx={{ mr: 1, color: 'text.secondary' }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#0F172A', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {title}
          </Typography>
        </Box>

        {/* Search Bar */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            bgcolor: '#F8FAFC',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            border: '1px solid #E2E8F0',
            width: 320,
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          }}
        >
          <SearchRoundedIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search records, lab tests, medications..."
            sx={{ fontSize: '0.875rem', width: '100%' }}
          />
        </Box>

        {/* Right Tools */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Multilingual Selector with all 23 languages */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={patient?.preferred_language || language}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                updatePatient({ preferred_language: newLang });
              }}
              variant="outlined"
              displayEmpty
              startAdornment={<TranslateRoundedIcon sx={{ fontSize: 16, mr: 0.75, color: 'primary.main' }} />}
              sx={{
                height: 36,
                fontSize: '0.8125rem',
                borderRadius: 2,
                bgcolor: '#F8FAFC',
                '& fieldset': { borderColor: '#E2E8F0' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 360 },
                },
              }}
            >
              {ALL_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.name}>
                  {lang.nativeName} ({lang.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Notifications */}
          <IconButton
            size="medium"
            onClick={() => setNotifDrawerOpen(true)}
            sx={{
              color: 'text.secondary',
              border: '1px solid #E2E8F0',
              borderRadius: 2,
              width: 38,
              height: 38,
            }}
          >
            <Badge badgeContent={2} color="error" variant="dot">
              <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {/* User Avatar & Menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            size="small"
            sx={{ ml: 0.5, border: '2px solid #E2E8F0' }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {patient?.name?.charAt(0) || 'V'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                minWidth: 200,
                mt: 1.5,
                borderRadius: 2,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {patient?.name || 'Vijay'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {patient?.abha_id || 'ABHA-DEMO-482915'}
              </Typography>
            </Box>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
              <PersonRoundedIcon sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
              Profile
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
              <SettingsRoundedIcon sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
      >
        <Box sx={{ width: 320, p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Clinical Alerts & Updates
          </Typography>
          <List>
            <ListItem sx={{ bgcolor: '#FEF3C7', borderRadius: 2, mb: 1.5, p: 1.5 }}>
              <ListItemText
                primary="Hemoglobin Below Reference Range"
                secondary="10.2 g/dL detected in Apollo Diagnostics Report. Normal is 12–16 g/dL."
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#92400E' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: '#B45309' }}
              />
            </ListItem>
            <ListItem sx={{ bgcolor: '#DCFCE7', borderRadius: 2, mb: 1.5, p: 1.5 }}>
              <ListItemText
                primary="Fasting Glucose Improving"
                secondary="Trend shows 16 mg/dL reduction compared to last month."
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: '#15803D' }}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};
