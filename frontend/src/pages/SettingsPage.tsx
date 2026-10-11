import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

export const SettingsPage: React.FC = () => {
  const [phiRedaction, setPhiRedaction] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [ttsAutoPlay, setTtsAutoPlay] = useState(false);

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Box>
        <Typography variant="h2" fontWeight={700}>
          Security & Privacy Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure clinical data privacy policies, ABDM consent parameters, and authentication security.
        </Typography>
      </Box>

      {/* Security Card */}
      <Card sx={{ p: 1.5 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <ShieldRoundedIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Health Data Governance
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Automated PHI De-identification & Redaction
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mask sensitive phone numbers, Aadhaar, and home addresses before LLM reasoning passes.
                </Typography>
              </Box>
              <Switch checked={phiRedaction} onChange={(e) => setPhiRedaction(e.target.checked)} color="primary" />
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Third-party ABDM Research Sharing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Explicit opt-in required for anonymized longitudinal epidemiologic studies.
                </Typography>
              </Box>
              <Switch checked={dataSharing} onChange={(e) => setDataSharing(e.target.checked)} color="primary" />
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Two-Factor Authentication (ABHA OTP)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Require mobile SMS verification code when exporting clinical bundles.
                </Typography>
              </Box>
              <Switch checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} color="primary" />
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Auto-play AI Voice Summary on Upload
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Synthesize medical summary audio immediately when a new report is processed.
                </Typography>
              </Box>
              <Switch checked={ttsAutoPlay} onChange={(e) => setTtsAutoPlay(e.target.checked)} color="primary" />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Compliance banner */}
      <Alert severity="info" icon={<SecurityRoundedIcon />} sx={{ borderRadius: 2 }}>
        MEDORA AI operates in strict alignment with DISHA (Digital Information Security in Healthcare Act) guidelines and HL7 FHIR Release 4 interoperability protocols.
      </Alert>
    </Box>
  );
};
