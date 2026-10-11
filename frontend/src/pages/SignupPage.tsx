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
  Alert,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { useAuth } from '../contexts/AuthContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms & Privacy Policy to proceed');
      return;
    }

    signup(name, email);
    navigate('/onboarding');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Left Visual */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          background: 'linear-gradient(135deg, #0E7490 0%, #2563EB 50%, #1D4ED8 100%)',
          color: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocalHospitalRoundedIcon sx={{ fontSize: 26, color: '#FFFFFF' }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            MEDORA AI
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 480 }}>
          <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1.25, mb: 2 }}>
            Take control of your personal health data today.
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Connect ABDM health records, monitor biometric trends, and ask our grounded medical AI assistant about your prescriptions and diagnoses.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.7)' }}>
          <SecurityRoundedIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" fontWeight={500}>
            Zero data sharing without explicit patient consent.
          </Typography>
        </Box>
      </Box>

      {/* Right Signup Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
        }}
      >
        <Card sx={{ maxWidth: 440, width: '100%', p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Create your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get started with your intelligent health timeline
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Full Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vijay Kumar"
                required
              />

              <TextField
                label="Email address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <FormControlLabel
                control={<Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} size="small" />}
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the{' '}
                    <Link href="#" underline="hover">
                      Terms
                    </Link>{' '}
                    &{' '}
                    <Link href="#" underline="hover">
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />

              <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.2 }}>
                Create Account
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" fontWeight={600} underline="hover">
                    Sign in
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
