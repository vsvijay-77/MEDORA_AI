import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import UpdateRoundedIcon from '@mui/icons-material/UpdateRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { MetricCard } from '../components/common/MetricCard';
import { StatusChip } from '../components/common/StatusChip';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { getLanguageOption, getSpeechLanguageCode } from '../types/languages';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { patient } = useAuth();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const activeLang = getLanguageOption(patient?.preferred_language || 'English');
  const speechLangCode = getSpeechLanguageCode(patient?.preferred_language || 'English');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ['workspace'],
    queryFn: () => api.getWorkspace(),
  });

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = async () => {
    if (isPlayingAudio) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const summaryText =
        workspace?.recent_summary ||
        'Your recent records show that fasting glucose decreased across your last three lab reports. One hemoglobin result is below the reference range shown in the report.';
      
      const fallbackToBrowser = () => {
        const utterance = new SpeechSynthesisUtterance(summaryText);
        utterance.lang = speechLangCode;
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice =
          voices.find((v) => v.lang.toLowerCase() === speechLangCode.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(speechLangCode.split('-')[0].toLowerCase()));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.rate = 0.95;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
      };

      try {
        const audioUrl = await api.synthesizeSpeech(summaryText, activeLang.name);
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audioPlayerRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => {
            setIsPlayingAudio(false);
            audioPlayerRef.current = null;
          };
          audio.onerror = () => {
            fallbackToBrowser();
          };
          await audio.play().catch(() => {
            fallbackToBrowser();
          });
        } else {
          fallbackToBrowser();
        }
      } catch {
        fallbackToBrowser();
      }
    }
  };

  const userName = patient?.name || 'User';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Welcome Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h1" fontWeight={700}>
            Good morning, {userName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Here’s a clear overview of your health records.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeRoundedIcon />}
          onClick={() => navigate('/copilot')}
          size="medium"
          sx={{ py: 1, px: 2.5 }}
        >
          Launch AI Copilot
        </Button>
      </Box>

      {/* Metric Cards Grid */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Medical Records"
            value={workspace?.total_documents ?? 24}
            icon={<FolderSharedRoundedIcon />}
            trend="+2 added this week"
            color="#2563EB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Active Medications"
            value={workspace?.total_medications ?? 5}
            icon={<MedicationRoundedIcon />}
            trend="All verified & active"
            color="#06B6D4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Recent Lab Tests"
            value={workspace?.total_lab_tests ?? 8}
            icon={<BiotechRoundedIcon />}
            trend="1 below reference range"
            color="#F59E0B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Last Updated"
            value="Today"
            icon={<UpdateRoundedIcon />}
            trend="Apollo Diagnostics Sync"
            color="#16A34A"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ bgcolor: '#FFFFFF', p: 1 }}>
        <CardContent>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<MedicationRoundedIcon color="primary" />}
                onClick={() => navigate('/copilot')}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  borderColor: '#E2E8F0',
                  color: 'text.primary',
                  '&:hover': { bgcolor: '#EFF6FF', borderColor: 'primary.main' },
                }}
              >
                Explain Prescription
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<BiotechRoundedIcon sx={{ color: '#06B6D4' }} />}
                onClick={() => navigate('/trends')}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  borderColor: '#E2E8F0',
                  color: 'text.primary',
                  '&:hover': { bgcolor: '#ECFEFF', borderColor: 'secondary.main' },
                }}
              >
                View Lab Trends
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<AutoAwesomeRoundedIcon sx={{ color: '#8B5CF6' }} />}
                onClick={() => navigate('/copilot')}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  borderColor: '#E2E8F0',
                  color: 'text.primary',
                  '&:hover': { bgcolor: '#F5F3FF', borderColor: '#8B5CF6' },
                }}
              >
                Ask Health Copilot
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<TimelineRoundedIcon sx={{ color: '#10B981' }} />}
                onClick={() => navigate('/timeline')}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  borderColor: '#E2E8F0',
                  color: 'text.primary',
                  '&:hover': { bgcolor: '#ECFDF5', borderColor: '#10B981' },
                }}
              >
                View Timeline
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* AI Health Summary Card */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
          border: '1px solid #BAE6FD',
          p: 1.5,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeRoundedIcon color="primary" />
              <Typography variant="h4" fontWeight={700} color="primary.dark">
                AI Health Summary & Analysis
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={isPlayingAudio ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
              onClick={handleToggleAudio}
              sx={{
                bgcolor: isPlayingAudio ? 'error.main' : 'primary.main',
                '&:hover': { bgcolor: isPlayingAudio ? 'error.dark' : 'primary.dark' },
              }}
            >
              {isPlayingAudio ? 'Stop' : `Listen (${activeLang.name})`}
            </Button>
          </Box>

          <Typography variant="body1" sx={{ color: '#1E293B', mb: 2, fontSize: '1rem', lineHeight: 1.6 }}>
            {workspace?.recent_summary ||
              'Your recent records show that fasting glucose decreased across your last three lab reports. One hemoglobin result is below the reference range shown in the report.'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              size="small"
              variant="text"
              color="primary"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => navigate('/copilot')}
              sx={{ fontWeight: 600, px: 0 }}
            >
              Ask Copilot to Analyze in Detail
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Records Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography variant="h4" fontWeight={600}>
              Recent Records
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => navigate('/records')}
              endIcon={<ArrowForwardRoundedIcon />}
            >
              View All
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #F1F5F9' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Document</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Confidence</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workspace?.recent_records?.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {record.filename}
                      </Typography>
                      {record.summary && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 320, display: 'block' }}>
                          {record.summary}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.doc_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.created_at}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={record.status} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge score={record.confidence_score} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => navigate(`/records/${record.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
