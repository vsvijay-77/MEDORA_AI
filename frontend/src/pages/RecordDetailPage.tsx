import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SourceRoundedIcon from '@mui/icons-material/SourceRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { StatusChip } from '../components/common/StatusChip';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';

export const RecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const documentData = {
    id: id || 'doc-001',
    name: 'Apollo Comprehensive Metabolic Panel & Prescription',
    doc_type: 'Lab Report & Prescription',
    date: '10 Oct 2026',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    hospital: 'Apollo Diagnostics Centre, Chennai',
    confidence: 94,
    status: 'Verified',
  };

  const labResults = [
    { test: 'Fasting Blood Glucose', value: '142 mg/dL', ref: '70 – 99', status: 'HIGH', date: '10 Oct 2026' },
    { test: 'Hemoglobin (Hb)', value: '10.2 g/dL', ref: '12.0 – 16.0', status: 'LOW', date: '10 Oct 2026' },
    { test: 'Serum Creatinine', value: '0.9 mg/dL', ref: '0.6 – 1.2', status: 'NORMAL', date: '10 Oct 2026' },
    { test: 'Total Cholesterol', value: '188 mg/dL', ref: '< 200', status: 'NORMAL', date: '10 Oct 2026' },
  ];

  const medications = [
    {
      name: 'Metformin Hydrochloride',
      dose: '500 mg',
      schedule: { morning: true, afternoon: false, night: true },
      instruction: 'After food',
      duration: '30 days',
      confidence: 96,
      status: 'Verified',
    },
    {
      name: 'Atorvastatin',
      dose: '10 mg',
      schedule: { morning: false, afternoon: false, night: true },
      instruction: 'At bedtime with water',
      duration: '30 days',
      confidence: 88,
      status: 'Verified',
    },
  ];

  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'demo-patient-001',
          name: [{ text: 'Vijay' }],
          identifier: [{ system: 'https://healthid.ndhm.gov.in', value: 'ABHA-DEMO-482915' }],
        },
      },
      {
        resource: {
          resourceType: 'MedicationRequest',
          status: 'active',
          medicationCodeableConcept: { text: 'Metformin 500 mg' },
          dosageInstruction: [{ timing: { code: { text: '1-0-1' } }, asNeededBoolean: false }],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          code: { text: 'Fasting Glucose' },
          valueQuantity: { value: 142, unit: 'mg/dL' },
          interpretation: [{ coding: [{ code: 'H', display: 'High' }] }],
        },
      },
    ],
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/records')}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h3" fontWeight={700}>
              {documentData.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <StatusChip status={documentData.status} />
              <Typography variant="caption" color="text.secondary">
                {documentData.date} • {documentData.doc_type}
              </Typography>
              <ConfidenceBadge score={documentData.confidence} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Overview" />
          <Tab label="Extracted Data" />
          <Tab label="Original Text" />
          <Tab label="FHIR JSON" />
        </Tabs>
      </Box>

      {/* TAB 0: OVERVIEW */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={3}>
            {/* Document Details */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Document Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Doctor:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {documentData.doctor}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Facility / Hospital:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {documentData.hospital}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Document Date:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {documentData.date}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Source Verification:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        Verified via OCR & ABDM Sandbox
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* AI Explanation / Facts Separation */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <AutoAwesomeRoundedIcon color="primary" />
                    <Typography variant="h5" fontWeight={600}>
                      AI Explanation
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {/* Document Facts */}
                  <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2, mb: 2, border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      Document Facts
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#0F172A' }}>
                      • Fasting Glucose: 142 mg/dL (Reference: 70–99 mg/dL).
                      <br />
                      • Hemoglobin: 10.2 g/dL (Reference: 12.0–16.0 g/dL).
                      <br />
                      • Prescription: Metformin 500mg BD for 30 days.
                    </Typography>
                  </Box>

                  {/* AI Explanation */}
                  <Box sx={{ bgcolor: '#EFF6FF', p: 1.5, borderRadius: 2, border: '1px solid #BFDBFE' }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: 'uppercase' }}>
                      Clinical Explanation
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#1E3A8A' }}>
                      The test reflects elevated fasting glucose and mild anemia. Metformin continues to regulate glycemic control. Discuss dietary iron intake or supplements with your doctor regarding the lower hemoglobin.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 1: EXTRACTED DATA (Prescriptions + Lab table) */}
      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Lab Report View */}
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={600}>
                  Laboratory Test Results
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compared against the reference range shown in the uploaded report.
                </Typography>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #F1F5F9' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Test</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Reference Range</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labResults.map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{r.test}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{r.ref}</TableCell>
                        <TableCell>
                          <StatusChip status={r.status} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{r.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Prescription View */}
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                Extracted Medications
              </Typography>

              <Grid container spacing={2}>
                {medications.map((med, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MedicationRoundedIcon color="primary" />
                          <Typography variant="subtitle1" fontWeight={700}>
                            {med.name}
                          </Typography>
                        </Box>
                        <StatusChip status={med.status} />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Dosage: <strong>{med.dose}</strong>
                      </Typography>

                      {/* Schedule display */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Schedule:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Typography variant="caption" sx={{ bgcolor: med.schedule.morning ? '#DCFCE7' : '#F1F5F9', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>
                            Morning {med.schedule.morning ? '✓' : '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ bgcolor: med.schedule.afternoon ? '#DCFCE7' : '#F1F5F9', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>
                            Afternoon {med.schedule.afternoon ? '✓' : '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ bgcolor: med.schedule.night ? '#DCFCE7' : '#F1F5F9', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>
                            Night {med.schedule.night ? '✓' : '—'}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        Instruction: <strong>{med.instruction}</strong> • Duration: <strong>{med.duration}</strong>
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: '1px solid #F1F5F9' }}>
                        <ConfidenceBadge score={med.confidence} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="text" startIcon={<CheckRoundedIcon />}>
                            Confirm
                          </Button>
                          <Button size="small" variant="text" startIcon={<EditRoundedIcon />}>
                            Edit
                          </Button>
                          <Button size="small" variant="text" startIcon={<SourceRoundedIcon />}>
                            View Source
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 2: ORIGINAL TEXT */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Extracted OCR Raw Text
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Normalized text read by MEDORA AI vision & OCR engine from the source document.
            </Typography>
            <Box
              sx={{
                bgcolor: '#0F172A',
                color: '#E2E8F0',
                p: 2.5,
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
{`APOLLO DIAGNOSTICS LABORATORY
Patient: Vijay | Age: 38 | Sex: Male
ABHA: ABHA-DEMO-482915 | Sample Date: 10-Oct-2026
Doctor: Dr. Rajesh Kumar, MD (Endocrinology)

INVESTIGATION RESULTS:
1. Fasting Blood Glucose (Spectrophotometry): 142 mg/dL [Reference: 70 - 99 mg/dL] - HIGH
2. Hemoglobin (Automated Cell Counter): 10.2 g/dL [Reference: 12.0 - 16.0 g/dL] - LOW
3. Serum Creatinine (Kinetic Jaffe): 0.9 mg/dL [Reference: 0.6 - 1.2 mg/dL] - NORMAL
4. Total Cholesterol (Enzymatic): 188 mg/dL [Reference: < 200 mg/dL] - NORMAL

Rx:
- Tab Metformin 500 mg: 1-0-1 after food x 30 days
- Tab Atorvastatin 10 mg: 0-0-1 at night x 30 days

Advised: Re-check fasting glucose & HbA1c in 3 months.`}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: FHIR JSON */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  FHIR R4 Resource Bundle
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  HL7 FHIR compliant JSON structure ready for ABDM health repository transmission.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyRoundedIcon />}
                onClick={() => navigator.clipboard.writeText(JSON.stringify(fhirBundle, null, 2))}
              >
                Copy JSON
              </Button>
            </Box>

            <Box
              sx={{
                bgcolor: '#0F172A',
                color: '#38BDF8',
                p: 2.5,
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.825rem',
                whiteSpace: 'pre-wrap',
                maxHeight: 500,
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(fhirBundle, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
