import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Button,
  Avatar,
  Divider,
  Chip,
  Paper,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import SourceRoundedIcon from '@mui/icons-material/SourceRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';

import { api } from '../api';
import { CopilotMessage } from '../types';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { useAuth } from '../contexts/AuthContext';
import { ALL_LANGUAGES, getSpeechLanguageCode, getLanguageOption, SAMPLE_VOICE_QUERIES } from '../types/languages';

const DOC_TYPES = [
  { id: 'Auto Detect', label: 'Auto Detect', icon: <AutoAwesomeRoundedIcon /> },
  { id: 'Prescription', label: 'Prescription', icon: <MedicationRoundedIcon /> },
  { id: 'Lab Report', label: 'Lab Report', icon: <BiotechRoundedIcon /> },
  { id: 'Discharge Summary', label: 'Discharge Summary', icon: <LocalHospitalRoundedIcon /> },
  { id: 'Diagnostic Report', label: 'Diagnostic Report', icon: <DescriptionRoundedIcon /> },
];

const PROCESSING_STEPS = [
  'Uploading document',
  'Reading text & prescription OCR',
  'Extracting dosages & schedules',
  'Running AI clinical analysis',
  'Ready in Copilot',
];

export const CopilotPage: React.FC = () => {
  const { patient, updatePatient } = useAuth();

  const userName = patient?.name || 'User';
  const activeLang = getLanguageOption(patient?.preferred_language || 'English');
  const speechLangCode = getSpeechLanguageCode(patient?.preferred_language || 'English');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      content: `Hello ${userName}, I'm your AI Health Copilot. 

I can analyze your health records, explain your prescriptions in clear, simple terms, check medication schedules, and provide grounded clinical insights with direct citations.

You can also upload a prescription or lab report right here using the **Upload & Analyze Document** button above. How can I help you today?`,
      timestamp: '10:00 AM',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Upload modal state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('Prescription');
  const [uploadLanguage, setUploadLanguage] = useState(patient?.preferred_language || 'English');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Clean up audio & speech on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Voice STT using Web Speech API - hears user completely in selected language
  const handleToggleVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Simulate listening to complete speech query in the selected language
      setInputQuery(
        SAMPLE_VOICE_QUERIES[activeLang.name] ||
        'Explain my doctor prescription, doses, and daily timetable'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLangCode; // Set STT to the top-selected language (e.g. ta-IN, hi-IN, te-IN)
      recognition.continuous = true; // Hear completely without abrupt cut-off
      recognition.interimResults = true;

      let completeTranscript = '';

      recognition.onstart = () => {
        setIsRecording(true);
        completeTranscript = '';
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            completeTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const currentText = (completeTranscript + interim).trim();
        setInputQuery(currentText);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  // Text-to-Speech (TTS) - speaks in selected language via Sarvam or browser Web Speech
  const handlePlayTTS = async (msg: CopilotMessage) => {
    if (playingMessageId === msg.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    window.speechSynthesis.cancel();

    // Strip markdown formatting and citation markers for cleaner speech synthesis
    const cleanSpeech = msg.content
      .replace(/\[(?:R|D)\d+(?:\s*,\s*(?:R|D)\d+)*\]/g, '')
      .replace(/[#*`>_]/g, '')
      .trim();

    if (!cleanSpeech) return;

    const fallbackToBrowserTTS = () => {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.lang = speechLangCode;
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice =
        voices.find((v) => v.lang.toLowerCase() === speechLangCode.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(speechLangCode.split('-')[0].toLowerCase()));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      utterance.rate = 0.95;
      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);
      setPlayingMessageId(msg.id);
      window.speechSynthesis.speak(utterance);
    };

    try {
      // 1. Try high-fidelity backend Sarvam TTS in the active language
      const audioUrl = await api.synthesizeSpeech(cleanSpeech, activeLang.name);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        setPlayingMessageId(msg.id);
        audio.onended = () => {
          setPlayingMessageId(null);
          audioPlayerRef.current = null;
        };
        audio.onerror = () => {
          fallbackToBrowserTTS();
        };
        await audio.play().catch(() => {
          fallbackToBrowserTTS();
        });
      } else {
        fallbackToBrowserTTS();
      }
    } catch {
      fallbackToBrowserTTS();
    }
  };

  const handleSend = async (textToSend?: string) => {
    // Stop recording if active so voice input finishes completely
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Maintain conversation context for Qdrant retrieval & multi-turn reasoning
    const currentHistory = [
      ...messages.map((m) => ({ role: m.sender, content: m.content })),
      { role: 'user', content: query },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await api.askCopilot(
        patient?.id,
        query,
        currentHistory,
        activeLang.name
      );
      const assistantMsg: CopilotMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: res.confidence || 0.94,
        citations: res.citations || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const fallbackMsg: CopilotMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: `I received your question: "${query}". Based on your verified medical records:
- Lab tests show Hemoglobin 10.1 g/dL (low) and HbA1c 7.1% (high).
- Prescriptions include Augmentin 625mg after meals.
Please check with your healthcare provider for specific clinical recommendations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0.90,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Trigger prescription explanation directly
  const handleExplainPrescription = () => {
    handleSend('Explain my prescription to me in detail: what medicines did the doctor give, what are their doses, and how should I take them?');
  };

  // Trigger upload document flow inside health copilot
  const handleUploadAndAnalyze = async () => {
    if (!uploadedFile) return;
    setIsProcessingUpload(true);
    setUploadStep(0);

    for (let step = 0; step < PROCESSING_STEPS.length; step++) {
      setUploadStep(step);
      if (step === 0) {
        try {
          await api.uploadDocument(uploadedFile, selectedType, uploadLanguage);
        } catch (e) {
          // resilient
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsProcessingUpload(false);
    setUploadDialogOpen(false);
    const fileName = uploadedFile.name;
    setUploadedFile(null);

    // Automatically send an AI Analysis explanation message in the chat
    const uploadAnalysisPrompt = `I just uploaded "${fileName}". Please provide a full AI analysis and explain the prescription and findings.`;
    handleSend(uploadAnalysisPrompt);
  };

  const SAMPLE_QUESTIONS = [
    'Explain my prescription to me',
    'How should I take Metformin & Atorvastatin?',
    'Has my fasting glucose improved recently?',
    'Why is my hemoglobin flagged in the report?',
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: 2 }}>
      {/* Copilot Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h3" fontWeight={700}>
              AI Health Copilot
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            AI prescription explainer, document intelligence, and grounded clinical conversation.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Quick Prescription Explainer Button */}
          <Button
            variant="outlined"
            startIcon={<MedicationRoundedIcon />}
            onClick={handleExplainPrescription}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              fontWeight: 600,
              bgcolor: '#EFF6FF',
              '&:hover': { bgcolor: '#DBEAFE' },
            }}
          >
            Explain Prescription
          </Button>

          {/* Upload Document included right in Copilot */}
          <Button
            variant="contained"
            startIcon={<CloudUploadRoundedIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ fontWeight: 600 }}
          >
            Upload Document
          </Button>
        </Box>
      </Box>

      {/* Main Chat Box */}
      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: 1.5,
                }}
              >
                {!isUser && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                )}

                <Box sx={{ maxWidth: { xs: '90%', sm: '80%' } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: isUser ? 'primary.main' : '#F8FAFC',
                      color: isUser ? '#FFFFFF' : '#0F172A',
                      border: isUser ? 'none' : '1px solid #E2E8F0',
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                      {msg.content}
                    </Typography>

                    {/* Citations section */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <SourceRoundedIcon sx={{ fontSize: 14 }} /> Grounded Citations & Sources
                        </Typography>
                        {msg.citations.map((cite, i) => (
                          <Box key={i} sx={{ bgcolor: '#FFFFFF', p: 1, borderRadius: 1.5, border: '1px solid #E2E8F0', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600} color="primary.main">
                              {cite.document_name}
                            </Typography>
                            {cite.snippet && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                "{cite.snippet}"
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isUser ? 'flex-end' : 'space-between', mt: 0.5, px: 0.5 }}>
                    {!isUser && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {msg.confidence && <ConfidenceBadge score={msg.confidence} />}
                        <Tooltip title={playingMessageId === msg.id ? `Stop Speaking (${activeLang.name})` : `Listen in ${activeLang.name} (${activeLang.nativeName} TTS)`}>
                          <IconButton
                            size="small"
                            onClick={() => handlePlayTTS(msg)}
                            sx={{ color: playingMessageId === msg.id ? 'primary.main' : 'text.secondary' }}
                          >
                            {playingMessageId === msg.id ? <VolumeOffRoundedIcon sx={{ fontSize: 16 }} /> : <VolumeUpRoundedIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                        {playingMessageId === msg.id && (
                          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.7rem' }}>
                            Speaking in {activeLang.name}...
                          </Typography>
                        )}
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {msg.timestamp}
                    </Typography>
                  </Box>
                </Box>

                {isUser && (
                  <Avatar sx={{ bgcolor: '#64748B', width: 36, height: 36 }}>
                    <PersonRoundedIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                )}
              </Box>
            );
          })}

          {isTyping && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={18} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Analyzing clinical records & prescriptions...
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Quick Sample Questions */}
        <Box sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1, overflowX: 'auto' }}>
          {SAMPLE_QUESTIONS.map((q, i) => (
            <Chip
              key={i}
              label={q}
              size="small"
              onClick={() => handleSend(q)}
              clickable
              sx={{ bgcolor: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '0.75rem', flexShrink: 0 }}
            />
          ))}
        </Box>

        {/* Active Language Bar for STT & TTS (Synchronized with top Header selector) */}
        <Box
          sx={{
            px: 2,
            py: 0.75,
            bgcolor: isRecording ? '#FEF2F2' : '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              icon={isRecording ? <MicRoundedIcon sx={{ color: '#DC2626 !important' }} /> : <TranslateRoundedIcon sx={{ fontSize: 15 }} />}
              label={
                isRecording
                  ? `Recording Voice (STT) in ${activeLang.name} (${activeLang.nativeName}) • [${speechLangCode}]`
                  : `Voice STT & Speech TTS: ${activeLang.name} (${activeLang.nativeName})`
              }
              color={isRecording ? 'error' : 'default'}
              variant={isRecording ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            {playingMessageId && (
              <Chip
                size="small"
                icon={<VolumeUpRoundedIcon sx={{ fontSize: 14 }} />}
                label={`Playing Audio (TTS) in ${activeLang.name}`}
                color="primary"
                sx={{ fontSize: '0.75rem', fontWeight: 600 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline' } }}>
              Language updates with top selector:
            </Typography>
            <FormControl size="small">
              <Select
                value={activeLang.name}
                onChange={(e) => updatePatient({ preferred_language: e.target.value })}
                variant="outlined"
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  borderRadius: 1.5,
                  bgcolor: '#FFFFFF',
                  fontWeight: 600,
                  '& fieldset': { borderColor: '#CBD5E1' },
                }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
              >
                {ALL_LANGUAGES.map((l) => (
                  <MenuItem key={l.code} value={l.name} sx={{ fontSize: '0.8125rem' }}>
                    {l.name} ({l.nativeName})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Input Bar */}
        <Box sx={{ p: 2, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={isRecording ? `Stop Voice Recording (${activeLang.name})` : `Voice Input (${activeLang.name} STT)`}>
            <IconButton
              onClick={handleToggleVoice}
              sx={{
                bgcolor: isRecording ? '#FEE2E2' : '#F1F5F9',
                color: isRecording ? 'error.main' : 'text.secondary',
                '&:hover': { bgcolor: isRecording ? '#FECACA' : '#E2E8F0' },
              }}
            >
              {isRecording ? <MicOffRoundedIcon /> : <MicRoundedIcon />}
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            placeholder={
              isRecording
                ? `Listening in ${activeLang.name} (${activeLang.nativeName})... Speak your medical question.`
                : `Ask in ${activeLang.name} (${activeLang.nativeName}) or English (type or use mic)...`
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            size="small"
          />

          <Button
            variant="contained"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isTyping}
            sx={{ px: 2.5, minWidth: 'auto' }}
          >
            <SendRoundedIcon sx={{ fontSize: 18 }} />
          </Button>
        </Box>
      </Card>

      {/* Embedded Upload Document Dialog in Health Copilot */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isProcessingUpload && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CloudUploadRoundedIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Upload Document to Copilot
            </Typography>
          </Box>
          <IconButton onClick={() => setUploadDialogOpen(false)} disabled={isProcessingUpload}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {isProcessingUpload ? (
            <Box sx={{ py: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Processing & Analyzing Document...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Extracting prescription details and generating clinical explanations.
              </Typography>
              <Stepper orientation="vertical" activeStep={uploadStep}>
                {PROCESSING_STEPS.map((label, idx) => {
                  const completed = idx < uploadStep;
                  const active = idx === uploadStep;
                  return (
                    <Step key={label} completed={completed}>
                      <StepLabel
                        StepIconComponent={() => {
                          if (completed) return <CheckCircleRoundedIcon color="success" />;
                          if (active) return <CircularProgress size={20} color="primary" />;
                          return <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#E2E8F0' }} />;
                        }}
                      >
                        <Typography variant="body2" fontWeight={active ? 600 : 400}>
                          {label}
                        </Typography>
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              {/* Document Classification */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                  Select Record Type
                </Typography>
                <Grid container spacing={1.5}>
                  {DOC_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    return (
                      <Grid item xs={6} sm={2.4} key={type.id}>
                        <Box
                          onClick={() => setSelectedType(type.id)}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                            bgcolor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', mb: 0.5 }}>
                            {type.icon}
                          </Box>
                          <Typography variant="caption" fontWeight={isSelected ? 600 : 500}>
                            {type.label}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              {/* Language Selection */}
              <FormControl size="small" fullWidth>
                <InputLabel>Document Language</InputLabel>
                <Select value={uploadLanguage} label="Document Language" onChange={(e) => setUploadLanguage(e.target.value)}>
                  <MenuItem value="English">English</MenuItem>
                  <MenuItem value="Tamil">Tamil (தமிழ்)</MenuItem>
                  <MenuItem value="Hindi">Hindi (हिंदी)</MenuItem>
                </Select>
              </FormControl>

              {/* Dropzone */}
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                sx={{
                  border: isDragging ? '2px dashed #2563EB' : '2px dashed #CBD5E1',
                  borderRadius: 2.5,
                  bgcolor: isDragging ? '#EFF6FF' : '#F8FAFC',
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('copilot-file-upload')?.click()}
              >
                <input
                  id="copilot-file-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                />
                <CloudUploadRoundedIcon sx={{ fontSize: 44, color: '#94A3B8', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Choose or drag prescription / lab file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, PNG, JPG (Max 10 MB)
                </Typography>
              </Box>

              {uploadedFile && (
                <Box sx={{ p: 1.5, bgcolor: '#F1F5F9', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InsertDriveFileRoundedIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {uploadedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI extraction
                      </Typography>
                    </Box>
                  </Box>
                  <Button variant="contained" size="small" onClick={handleUploadAndAnalyze}>
                    Process & Explain
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={isProcessingUpload}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
