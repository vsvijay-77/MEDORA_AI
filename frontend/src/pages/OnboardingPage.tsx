import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useAuth } from '../contexts/AuthContext';

const STEPS = ['Welcome', 'Basic Details', 'Mock ABHA', 'Preferred Language', 'Finish'];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { patient, updatePatient } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  const [fullName, setFullName] = useState(patient?.name || 'Vijay');
  const [dob, setDob] = useState(patient?.dob || '1988-05-14');
  const [gender, setGender] = useState(patient?.gender || 'Male');
  const [language, setLanguage] = useState(patient?.preferred_language || 'English');
  const mockAbha = 'ABHA-DEMO-482915';

  const handleNext = () => {
    if (activeStep === 1) {
      updatePatient({ name: fullName, dob, gender });
    } else if (activeStep === 2) {
      updatePatient({ abha_id: mockAbha });
    } else if (activeStep === 3) {
      updatePatient({ preferred_language: language });
    } else if (activeStep === 4) {
      navigate('/dashboard');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 650, width: '100%', p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* STEP 0: Welcome */}
          {activeStep === 0 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 54, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Let’s build your health profile.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 4 }}>
                MEDORA AI transforms paper prescriptions, discharge slips, and scattered lab PDFs into a unified, actionable clinical history.
              </Typography>
              <Button variant="contained" size="large" onClick={handleNext} sx={{ px: 4 }}>
                Get Started
              </Button>
            </Box>
          )}

          {/* STEP 1: Basic Details */}
          {activeStep === 1 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Basic Patient Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                These details help verify patient ownership on incoming clinical records.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Full Legal Name"
                  fullWidth
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <TextField
                  label="Date of Birth"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                    <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}

          {/* STEP 2: Mock ABHA */}
          {activeStep === 2 && (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <BadgeRoundedIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1.5 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Ayushman Bharat Health Account (ABHA)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                We have linked a sandbox ABHA identifier to simulate ABDM health repository synchronization.
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  bgcolor: '#EFF6FF',
                  border: '2px dashed #93C5FD',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  mb: 2,
                }}
              >
                <Typography variant="h5" fontWeight={700} color="primary.dark">
                  {mockAbha}
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 1, maxWidth: 500, mx: 'auto', textAlign: 'left', borderRadius: 2 }}>
                Demo identifier — not an official ABHA number. Allows seamless testing of ABDM and FHIR records.
              </Alert>
            </Box>
          )}

          {/* STEP 3: Preferred Language */}
          {activeStep === 3 && (
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <TranslateRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Preferred Language
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select your language for AI clinical explanations, voice responses, and document translations.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { id: 'English', label: 'English', desc: 'Standard medical records summary & copilot audio' },
                  { id: 'Tamil', label: 'தமிழ் (Tamil)', desc: 'மருத்துவ ஆவணங்களின் எளிய தமிழ் விளக்கம்' },
                  { id: 'Hindi', label: 'हिंदी (Hindi)', desc: 'चिकित्सा रिपोर्ट का सरल हिंदी सारांश' },
                ].map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => setLanguage(item.id)}
                    sx={{
                      cursor: 'pointer',
                      border: language === item.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      bgcolor: language === item.id ? '#EFF6FF' : '#FFFFFF',
                      p: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.desc}
                        </Typography>
                      </Box>
                      {language === item.id && <Chip label="Selected" color="primary" size="small" />}
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* STEP 4: Finish */}
          {activeStep === 4 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 58, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Your health workspace is ready.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
                Your clinical records have been synchronized with the demo workspace. You can now explore your lab trends, inspect prescription schedules, or chat with your AI Copilot.
              </Typography>
            </Box>
          )}

          {/* Stepper Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid #F1F5F9' }}>
            {activeStep > 0 && activeStep < 4 ? (
              <Button onClick={handleBack} variant="outlined" sx={{ borderColor: '#CBD5E1' }}>
                Back
              </Button>
            ) : (
              <Box />
            )}
            {activeStep > 0 && (
              <Button variant="contained" onClick={handleNext} sx={{ px: 3 }}>
                {activeStep === 4 ? 'Enter Workspace' : 'Continue'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
