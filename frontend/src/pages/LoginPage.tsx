import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import GoogleIcon from '@mui/icons-material/Google';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email and password');
      return;
    }
    login(email, fullName);
    navigate('/dashboard');
  };

  const handleDemoSignIn = (demoName: string, demoEmail: string) => {
    login(demoEmail, demoName);
    navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left Medical Abstract Visual with High-Contrast Glassmorphic Showcase */}
      <Box
        sx={{
          flex: 1.15,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 6, xl: 8 },
          background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft Ambient Light Orbs */}
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0) 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, zIndex: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <LocalHospitalRoundedIcon sx={{ fontSize: 30, color: '#38BDF8' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em" sx={{ color: '#FFFFFF', lineHeight: 1.1 }}>
              MEDORA AI
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#BAE6FD',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
              }}
            >
              AI-Powered Personal Health Copilot
            </Typography>
          </Box>
        </Box>

        {/* Centerpiece Hero Statement & High-Contrast Visual Cards */}
        <Box sx={{ maxWidth: 540, zIndex: 2, my: 'auto', py: 3 }}>
          <Chip
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: '#38BDF8 !important' }} />}
            label="Next-Gen Clinical Intelligence"
            sx={{
              bgcolor: 'rgba(15,23,42,0.5)',
              color: '#F0F9FF',
              borderColor: 'rgba(56,189,248,0.4)',
              mb: 2.5,
              fontWeight: 700,
              fontSize: '0.8125rem',
              backdropFilter: 'blur(12px)',
            }}
            variant="outlined"
          />

          <Typography
            variant="h2"
            fontWeight={800}
            sx={{
              fontSize: { md: '2.5rem', xl: '3.1rem' },
              lineHeight: 1.18,
              mb: 2.5,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
            }}
          >
            Your medical records,{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #38BDF8 0%, #A5B4FC 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              finally understandable.
            </Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#E2E8F0',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              mb: 4,
            }}
          >
            Organize prescriptions, lab reports, discharge slips, and lifelong health milestones in one calm, intelligent workspace.
          </Typography>

          {/* Attractive Feature Highlights with Healthcare Icons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                icon: <MedicationRoundedIcon sx={{ color: '#38BDF8', fontSize: 24 }} />,
                bg: 'rgba(56,189,248,0.14)',
                border: 'rgba(56,189,248,0.25)',
                title: 'Prescription & Dosage Timetable',
                desc: 'Automatic 1-0-1 morning, afternoon, and bedtime scheduling with food guidelines.',
              },
              {
                icon: <BiotechRoundedIcon sx={{ color: '#34D399', fontSize: 24 }} />,
                bg: 'rgba(52,211,153,0.14)',
                border: 'rgba(52,211,153,0.25)',
                title: 'Grounded Lab Analytics & Citations',
                desc: 'Qdrant vector retrieval citing exact lab values, dates, and reference ranges.',
              },
              {
                icon: <TranslateRoundedIcon sx={{ color: '#FBBF24', fontSize: 24 }} />,
                bg: 'rgba(251,191,36,0.14)',
                border: 'rgba(251,191,36,0.25)',
                title: '23 Multilingual Indian Languages',
                desc: 'Listen and read medical explanations in English, Tamil, Hindi, Telugu, and more.',
              },
            ].map((f, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: 'rgba(15,23,42,0.45)',
                  border: `1px solid ${f.border}`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: f.bg,
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                  }}
                >
                  {f.icon}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#FFFFFF', fontSize: '0.925rem' }}>
                    {f.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.8rem', display: 'block', lineHeight: 1.4 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Security & Compliance Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            pt: 2.5,
            borderTop: '1px solid rgba(255,255,255,0.14)',
            zIndex: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#E2E8F0' }}>
            <HealthAndSafetyRoundedIcon sx={{ fontSize: 22, color: '#38BDF8' }} />
            <Typography variant="caption" fontWeight={600} sx={{ color: '#F1F5F9' }}>
              ABDM & FHIR R4 Ready • End-to-End Encrypted Personal Health Vault
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
            v2.0.0
          </Typography>
        </Box>
      </Box>

      {/* Right Modern Form Card */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 5, md: 7 },
          bgcolor: '#F8FAFC',
          position: 'relative',
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.03)',
            bgcolor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '0 !important' }}>
            {/* Header */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ alignItems: 'center', gap: 1.5, mb: 1.5, display: { xs: 'flex', lg: 'none' } }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <LocalHospitalRoundedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />
                </Avatar>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  MEDORA AI
                </Typography>
              </Box>

              <Typography variant="h4" fontWeight={800} sx={{ color: '#0F172A', letterSpacing: '-0.02em', mb: 0.75 }}>
                Sign in to your health vault
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.9rem' }}>
                Enter your credentials or name to personalize your health workspace
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              {/* Optional Name for Greeting */}
              <TextField
                label="Your Name (Optional)"
                fullWidth
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul, Priya, Alex"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                helperText="How should your Health Copilot greet you on your dashboard?"
              />

              {/* Email Address */}
              <TextField
                label="Email address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AlternateEmailRoundedIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Password with Eye Visibility Toggle */}
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyRoundedIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#475569' }}
                      >
                        {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Remember me & Forgot Password */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>Remember this device</Typography>}
                />
                <Link href="#" variant="body2" underline="hover" color="primary.main" fontWeight={600}>
                  Forgot password?
                </Link>
              </Box>

              {/* Primary Sign In Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  py: 1.35,
                  fontSize: '0.975rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  mt: 0.5,
                }}
              >
                Sign In
              </Button>

              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  OR EXPLORE DEMO
                </Typography>
              </Divider>

              {/* Quick Demo Buttons */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<BadgeRoundedIcon sx={{ fontSize: 18, color: '#475569' }} />}
                  onClick={() => handleDemoSignIn('Guest User', 'guest@medora.ai')}
                  sx={{
                    py: 1,
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    bgcolor: '#FFFFFF',
                    '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' },
                  }}
                >
                  Continue as Guest
                </Button>

                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<GoogleIcon sx={{ fontSize: 18 }} />}
                  onClick={() => handleDemoSignIn('Google User', 'google.user@medora.ai')}
                  sx={{
                    py: 1,
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    bgcolor: '#FFFFFF',
                    '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' },
                  }}
                >
                  Continue with Google
                </Button>
              </Box>

              {/* Signup Redirect */}
              <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  First time using MEDORA AI?{' '}
                  <Link component={RouterLink} to="/signup" fontWeight={700} underline="hover" color="primary.main">
                    Create account
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
