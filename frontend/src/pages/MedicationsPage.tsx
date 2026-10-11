import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { StatusChip } from '../components/common/StatusChip';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';

const ALL_MEDICATIONS = [
  {
    id: 'med-1',
    name: 'Metformin Hydrochloride',
    dosage: '500 mg',
    schedule: { morning: true, afternoon: false, night: true },
    instruction: 'Take with or immediately after food',
    duration: '90 days',
    confidence: 96,
    status: 'Active',
    prescribedBy: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    prescribedDate: '08 Oct 2026',
    category: 'active',
  },
  {
    id: 'med-2',
    name: 'Atorvastatin',
    dosage: '10 mg',
    schedule: { morning: false, afternoon: false, night: true },
    instruction: 'At bedtime with plenty of water',
    duration: '90 days',
    confidence: 94,
    status: 'Active',
    prescribedBy: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    prescribedDate: '08 Oct 2026',
    category: 'active',
  },
  {
    id: 'med-3',
    name: 'Vitamin D3 (Cholecalciferol)',
    dosage: '60,000 IU',
    schedule: { morning: true, afternoon: false, night: false },
    instruction: 'Once weekly after breakfast',
    duration: '8 weeks',
    confidence: 98,
    status: 'Active',
    prescribedBy: 'Dr. A. Verma, General Medicine',
    prescribedDate: '22 Sep 2026',
    category: 'active',
  },
  {
    id: 'med-4',
    name: 'Pantoprazole',
    dosage: '40 mg',
    schedule: { morning: true, afternoon: false, night: false },
    instruction: 'Early morning empty stomach',
    duration: '14 days (Course Completed)',
    confidence: 95,
    status: 'Discontinued',
    prescribedBy: 'CarePoint Multi-Specialty Hospital',
    prescribedDate: '12 Jul 2026',
    category: 'past',
  },
  {
    id: 'med-5',
    name: 'Paracetamol',
    dosage: '650 mg',
    schedule: { morning: true, afternoon: false, night: true },
    instruction: 'As needed for fever/pain SOS',
    duration: '5 days (Course Completed)',
    confidence: 99,
    status: 'Discontinued',
    prescribedBy: 'Dr. Rajesh Kumar, MD',
    prescribedDate: '10 May 2026',
    category: 'past',
  },
];

export const MedicationsPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0); // 0: Active, 1: Past, 2: All

  const filteredMeds = ALL_MEDICATIONS.filter((m) => {
    if (tabIndex === 0) return m.category === 'active';
    if (tabIndex === 1) return m.category === 'past';
    return true;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Medications & Prescriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Digitized medicine regimens, schedules, and active prescriptions synchronized from clinical consultations.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)}>
          <Tab label="Active Regimens" />
          <Tab label="Past / Discontinued" />
          <Tab label="All Medications" />
        </Tabs>
      </Box>

      {/* Medications Grid */}
      <Grid container spacing={2.5}>
        {filteredMeds.map((med) => (
          <Grid item xs={12} md={6} key={med.id}>
            <Card
              sx={{
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <MedicationRoundedIcon color="primary" sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {med.name}
                      </Typography>
                      <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
                        {med.dosage}
                      </Typography>
                    </Box>
                  </Box>
                  <StatusChip status={med.status} />
                </Box>

                {/* 1-0-1 visual schedule */}
                <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2, mb: 2, border: '1px solid #F1F5F9' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
                    DAILY DOSAGE SCHEDULE
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: med.schedule.morning ? '#EFF6FF' : '#F1F5F9',
                        color: med.schedule.morning ? 'primary.main' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: med.schedule.morning ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                      }}
                    >
                      Morning {med.schedule.morning ? '✓ (1)' : '— (0)'}
                    </Box>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: med.schedule.afternoon ? '#EFF6FF' : '#F1F5F9',
                        color: med.schedule.afternoon ? 'primary.main' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: med.schedule.afternoon ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                      }}
                    >
                      Afternoon {med.schedule.afternoon ? '✓ (1)' : '— (0)'}
                    </Box>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: med.schedule.night ? '#EFF6FF' : '#F1F5F9',
                        color: med.schedule.night ? 'primary.main' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: med.schedule.night ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                      }}
                    >
                      Night {med.schedule.night ? '✓ (1)' : '— (0)'}
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Instruction:</strong> {med.instruction}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Duration:</strong> {med.duration}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Prescribed by {med.prescribedBy} on {med.prescribedDate}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                <ConfidenceBadge score={med.confidence} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="text" startIcon={<CheckRoundedIcon />}>
                    Confirm
                  </Button>
                  <Button size="small" variant="text" startIcon={<EditRoundedIcon />}>
                    Edit
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
