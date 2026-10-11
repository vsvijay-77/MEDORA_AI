import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

const FHIR_RESOURCES = [
  {
    type: 'Patient',
    desc: 'ABDM linked demographic entity with National Health ID',
    status: 'Valid R4',
    json: {
      resourceType: 'Patient',
      id: 'demo-patient-001',
      identifier: [
        {
          system: 'https://healthid.ndhm.gov.in',
          value: 'ABHA-DEMO-482915',
        },
      ],
      name: [{ use: 'official', family: 'Kumar', given: ['Vijay'] }],
      gender: 'male',
      birthDate: '1988-05-14',
    },
  },
  {
    type: 'MedicationRequest',
    desc: 'Prescription order for Metformin Hydrochloride 500mg BD',
    status: 'Valid R4',
    json: {
      resourceType: 'MedicationRequest',
      id: 'med-req-101',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{ system: 'http://snomed.info/sct', code: '31610008', display: 'Metformin' }],
        text: 'Metformin 500 mg',
      },
      dosageInstruction: [
        {
          text: '1 tablet twice daily after meals',
          timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } },
        },
      ],
    },
  },
  {
    type: 'Observation',
    desc: 'Pathology finding: Fasting Blood Glucose (142 mg/dL)',
    status: 'Valid R4',
    json: {
      resourceType: 'Observation',
      id: 'obs-glucose-202',
      status: 'final',
      category: [
        {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }],
        },
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: '1558-6', display: 'Fasting glucose [Mass/volume] in Blood' }],
      },
      valueQuantity: { value: 142, unit: 'mg/dL', system: 'http://unitsofmeasure.org' },
      interpretation: [
        {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'H', display: 'High' }],
        },
      ],
    },
  },
  {
    type: 'Condition',
    desc: 'Clinical problem list: Type 2 Diabetes Mellitus',
    status: 'Valid R4',
    json: {
      resourceType: 'Condition',
      id: 'cond-diabetes-303',
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
      },
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' }],
      },
      subject: { reference: 'Patient/demo-patient-001' },
    },
  },
];

export const FhirPage: React.FC = () => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (json: object, type: string) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            FHIR R4 & ABDM Interoperability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Standards-compliant HL7 FHIR resources ready for exchange across Ayushman Bharat Digital Mission (ABDM) gateways.
          </Typography>
        </Box>
        <Chip
          icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
          label="ABDM Sandbox Validated"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Resource Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {FHIR_RESOURCES.map((resource) => (
          <Accordion key={resource.type} defaultExpanded sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {resource.type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {resource.desc}
                  </Typography>
                </Box>
                <Chip label={resource.status} size="small" color="primary" sx={{ bgcolor: '#EFF6FF', color: 'primary.dark' }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={() => handleCopy(resource.json, resource.type)}
                >
                  {copiedType === resource.type ? 'Copied!' : 'Copy FHIR JSON'}
                </Button>
              </Box>
              <Box
                sx={{
                  bgcolor: '#0F172A',
                  color: '#38BDF8',
                  p: 2,
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.825rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(resource.json, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};
