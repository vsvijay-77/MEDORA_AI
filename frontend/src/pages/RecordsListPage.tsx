import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import { useNavigate } from 'react-router-dom';
import { StatusChip } from '../components/common/StatusChip';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';

const ALL_RECORDS = [
  {
    id: 'doc-001',
    filename: 'Apollo Comprehensive Metabolic Panel',
    doc_type: 'Lab Report',
    date: '10 Oct 2026',
    doctor: 'Apollo Diagnostics Centre',
    status: 'Verified',
    confidence: 94,
    summary: 'Fasting Blood Glucose 142 mg/dL (High), Hemoglobin 10.2 g/dL (Low), Serum Creatinine 0.9 mg/dL (Normal).',
  },
  {
    id: 'doc-002',
    filename: 'Dr. Kumar Clinics - Diabetes Follow-up Prescription',
    doc_type: 'Prescription',
    date: '08 Oct 2026',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    status: 'Review',
    confidence: 86,
    summary: 'Metformin 500 mg BD and Atorvastatin 10 mg at night prescribed for 30 days.',
  },
  {
    id: 'doc-003',
    filename: 'CarePoint Multi-Specialty Annual Health Checkup',
    doc_type: 'Discharge Summary',
    date: '22 Sep 2026',
    doctor: 'CarePoint Hospital',
    status: 'Verified',
    confidence: 98,
    summary: 'Executive health evaluation, resting ECG normal, cardiovascular risk index minimal.',
  },
  {
    id: 'doc-004',
    filename: 'Thyroid Function Test (T3/T4/TSH)',
    doc_type: 'Lab Report',
    date: '15 Aug 2026',
    doctor: 'Medall Healthcare',
    status: 'Needs Confirmation',
    confidence: 74,
    summary: 'TSH slightly elevated at 5.8 uIU/mL. Recommended clinical review.',
  },
  {
    id: 'doc-005',
    filename: 'Ophthalmology Fundus Examination Report',
    doc_type: 'Diagnostic Report',
    date: '12 Jul 2026',
    doctor: 'Dr. Agarwal Eye Hospital',
    status: 'Verified',
    confidence: 95,
    summary: 'Dilated fundoscopy: No diabetic retinopathy, clear optic disc margins.',
  },
];

export const RecordsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = ALL_RECORDS.filter((r) => {
    const matchesSearch =
      r.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doctor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || r.doc_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Medical Records Repository
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Structured archive of your digitized prescriptions, lab findings, and clinical documents.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<CloudUploadRoundedIcon />}
          onClick={() => navigate('/upload')}
        >
          Upload Record
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Card sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search records by name, doctor, or test findings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Record Type</InputLabel>
            <Select value={typeFilter} label="Record Type" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="All">All Types</MenuItem>
              <MenuItem value="Prescription">Prescriptions</MenuItem>
              <MenuItem value="Lab Report">Lab Reports</MenuItem>
              <MenuItem value="Discharge Summary">Discharge Summaries</MenuItem>
              <MenuItem value="Diagnostic Report">Diagnostic Reports</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Records Grid */}
      <Grid container spacing={2.5}>
        {filtered.map((record) => (
          <Grid item xs={12} md={6} key={record.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 2,
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' },
              }}
              onClick={() => navigate(`/records/${record.id}`)}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h5" fontWeight={600} color="text.primary">
                    {record.filename}
                  </Typography>
                  <StatusChip status={record.status} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  {record.date} • {record.doc_type} • {record.doctor}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                  {record.summary}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                <ConfidenceBadge score={record.confidence} showBar />
                <Button size="small" variant="text" endIcon={<VisibilityRoundedIcon />}>
                  Inspect Record
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
