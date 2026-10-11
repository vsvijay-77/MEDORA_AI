import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
  const { patient, updatePatient } = useAuth();
  const [name, setName] = useState(patient?.name || 'Vijay');
  const [dob, setDob] = useState(patient?.dob || '1988-05-14');
  const [gender, setGender] = useState(patient?.gender || 'Male');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePatient({ name, dob, gender });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Box>
        <Typography variant="h2" fontWeight={700}>
          Personal Health Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage identity, linked ABDM credentials, and emergency demographic attributes.
        </Typography>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Profile attributes successfully updated.
        </Alert>
      )}

      {/* Patient Card */}
      <Card sx={{ p: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'primary.main',
                fontSize: '1.75rem',
                fontWeight: 700,
              }}
            >
              {name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <BadgeRoundedIcon color="secondary" sx={{ fontSize: 18 }} />
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  {patient?.abha_id || 'ABHA-DEMO-482915'}
                </Typography>
                <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Birth"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gender"
                  fullWidth
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ABDM Ayushman Bharat ID"
                  fullWidth
                  value={patient?.abha_id || 'ABHA-DEMO-482915'}
                  disabled
                  helperText="ABDM Demo ID linked for sandbox clinical records"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" sx={{ px: 3 }}>
                Save Profile
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
