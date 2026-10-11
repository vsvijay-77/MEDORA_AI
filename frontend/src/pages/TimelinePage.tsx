import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import WbTwilightRoundedIcon from '@mui/icons-material/WbTwilightRounded';
import BedtimeRoundedIcon from '@mui/icons-material/BedtimeRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { useNavigate } from 'react-router-dom';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { StatusChip } from '../components/common/StatusChip';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import { getLanguageOption, getSpeechLanguageCode } from '../types/languages';

// Chronological medical events collected across verified patient documents
const TIMELINE_EVENTS = [
  {
    id: 'tl-1',
    date: '10 Oct 2026',
    title: 'Fasting Blood Sugar & Comprehensive Metabolic Panel',
    doc_type: 'Lab Result',
    doctor: 'Apollo Diagnostics Laboratory',
    summary: 'Fasting glucose was measured at 142 mg/dL (decreasing from 158 mg/dL in Sep). Hemoglobin was 10.2 g/dL (reference: 12-16 g/dL).',
    confidence: 94,
    doc_id: 'doc-001',
    tags: ['Fasting Glucose: 142 mg/dL', 'Hemoglobin: 10.2 g/dL', 'Creatinine: 0.9 mg/dL'],
  },
  {
    id: 'tl-2',
    date: '08 Oct 2026',
    title: 'Diabetes & Dyslipidemia Clinical Review',
    doc_type: 'Prescription',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    summary: 'Adjusted prescription to Metformin 500mg (1-0-1 after meals) and added Atorvastatin 10mg at bedtime for cholesterol control.',
    confidence: 96,
    doc_id: 'doc-002',
    tags: ['Metformin 500mg', 'Atorvastatin 10mg', 'Prescription Renewed'],
  },
  {
    id: 'tl-3',
    date: '22 Sep 2026',
    title: 'Annual Executive Health Checkup & Discharge Summary',
    doc_type: 'Discharge Summary',
    doctor: 'CarePoint Multi-Specialty Hospital',
    summary: 'Resting ECG normal, treadmill stress test negative for inducible ischemia. BMI calculated at 25.4. Prescribed Vitamin D3 60,000 IU and B-Complex.',
    confidence: 98,
    doc_id: 'doc-003',
    tags: ['Cardiac Evaluation', 'BMI 25.4', 'ECG Normal', 'Vitamin D3 Prescribed'],
  },
  {
    id: 'tl-4',
    date: '15 Aug 2026',
    title: 'Thyroid Function Evaluation (TFT)',
    doc_type: 'Lab Result',
    doctor: 'Medall Healthcare Lab',
    summary: 'TSH slightly elevated at 5.8 uIU/mL. Free T3 and Free T4 were within normal ranges.',
    confidence: 74,
    doc_id: 'doc-004',
    tags: ['TSH: 5.8 uIU/mL', 'Subclinical Hypothyroidism'],
  },
  {
    id: 'tl-5',
    date: '12 Jul 2026',
    title: 'Annual Diabetic Retinopathy Fundoscopy Screening',
    doc_type: 'Diagnostic Report',
    doctor: 'Dr. Agarwal Eye Hospital',
    summary: 'Fundus examination showed no evidence of diabetic microvascular changes or maculopathy.',
    confidence: 95,
    doc_id: 'doc-005',
    tags: ['Ophthalmology', 'Fundus Clear'],
  },
];

export interface TabletScheduleItem {
  id: string;
  time: string;
  slotName: string;
  slotCategory: 'morning' | 'afternoon' | 'night' | 'weekly';
  name: string;
  genericName: string;
  dosage: string;
  form: 'Tablet' | 'Capsule' | 'Sachet';
  foodInstruction: string;
  foodType: 'empty-stomach' | 'after-food' | 'bedtime';
  purpose: string;
  frequency: string;
  doctor: string;
  docId: string;
  sourceDoc: string;
  warning?: string;
  color: string;
  badgeBg: string;
}

// Master Daily Tablet Timetable: What Time What Medicine To Take
export const TABLET_SCHEDULE_DATA: TabletScheduleItem[] = [
  {
    id: 'med-sch-1',
    time: '07:00 AM',
    slotName: 'Early Morning (Fasting)',
    slotCategory: 'morning',
    name: 'Pantoprazole',
    genericName: 'Pan-40 (Proton Pump Inhibitor)',
    dosage: '40 mg',
    form: 'Tablet',
    foodInstruction: '30 minutes before breakfast on an empty stomach with plain water',
    foodType: 'empty-stomach',
    purpose: 'Prevents acid reflux and protects stomach lining during daily diabetes regimen',
    frequency: '1-0-0 (Once daily morning)',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    docId: 'doc-002',
    sourceDoc: 'Prescription (08 Oct 2026)',
    warning: 'Swallow whole with water. Do not crush, chew, or break the enteric-coated tablet.',
    color: '#D97706',
    badgeBg: '#FEF3C7',
  },
  {
    id: 'med-sch-2',
    time: '08:30 AM',
    slotName: 'Morning (Post Breakfast)',
    slotCategory: 'morning',
    name: 'Metformin Hydrochloride',
    genericName: 'Glycomet (Biguanide Antidiabetic)',
    dosage: '500 mg',
    form: 'Tablet',
    foodInstruction: 'Immediately after breakfast (within 10-15 minutes)',
    foodType: 'after-food',
    purpose: 'Regulates post-breakfast blood sugar and suppresses hepatic glucose output',
    frequency: '1-0-1 (Twice daily: Morning & Night)',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    docId: 'doc-002',
    sourceDoc: 'Prescription (08 Oct 2026)',
    warning: 'Always consume with or after meals to avoid gastrointestinal discomfort or nausea.',
    color: '#2563EB',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'med-sch-3',
    time: '09:00 AM (Sun)',
    slotName: 'Weekly Special (Sunday)',
    slotCategory: 'weekly',
    name: 'Cholecalciferol (Vitamin D3)',
    genericName: 'Calcirol 60K (High Potency D3)',
    dosage: '60,000 IU',
    form: 'Capsule',
    foodInstruction: 'Once weekly on Sunday mornings with a glass of milk or post-breakfast',
    foodType: 'after-food',
    purpose: 'Corrects Vitamin D deficiency, elevates bone density and supports calcium uptake',
    frequency: 'Once a week (Every Sunday for 8 weeks)',
    doctor: 'CarePoint Multi-Specialty Hospital',
    docId: 'doc-003',
    sourceDoc: 'Discharge Summary (22 Sep 2026)',
    warning: 'Fat-soluble vitamin; absorption is highest when consumed with milk or dietary fat.',
    color: '#D97706',
    badgeBg: '#FFFBEB',
  },
  {
    id: 'med-sch-4',
    time: '01:30 PM',
    slotName: 'Afternoon (Post Lunch)',
    slotCategory: 'afternoon',
    name: 'B-Complex with Zinc & Methylcobalamin',
    genericName: 'Becozinc / Neurobion Forte',
    dosage: '1 Capsule',
    form: 'Capsule',
    foodInstruction: 'Immediately after lunch with a full glass of water',
    foodType: 'after-food',
    purpose: 'Cellular energy, peripheral nerve protection, and counteracts B12 depletion',
    frequency: '0-1-0 (Once daily post-lunch)',
    doctor: 'CarePoint Multi-Specialty Hospital',
    docId: 'doc-003',
    sourceDoc: 'Executive Health Checkup (22 Sep 2026)',
    warning: 'Harmless bright yellow urine discoloration is completely normal with B-vitamins.',
    color: '#0891B2',
    badgeBg: '#ECFEFF',
  },
  {
    id: 'med-sch-5',
    time: '08:30 PM',
    slotName: 'Night (Post Dinner)',
    slotCategory: 'night',
    name: 'Metformin Hydrochloride',
    genericName: 'Glycomet (Biguanide Antidiabetic)',
    dosage: '500 mg',
    form: 'Tablet',
    foodInstruction: 'Immediately after dinner (with warm water)',
    foodType: 'after-food',
    purpose: 'Controls post-dinner glucose spikes and prevents the overnight dawn phenomenon',
    frequency: '1-0-1 (Twice daily: Morning & Night)',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    docId: 'doc-002',
    sourceDoc: 'Prescription (08 Oct 2026)',
    warning: 'Do not skip dinner before taking. Maintain good water intake.',
    color: '#2563EB',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'med-sch-6',
    time: '10:00 PM',
    slotName: 'Bedtime (Before Sleep)',
    slotCategory: 'night',
    name: 'Atorvastatin',
    genericName: 'Atorva / Lipitor (Statin)',
    dosage: '10 mg',
    form: 'Tablet',
    foodInstruction: 'At bedtime with a glass of water (can be taken with or without food)',
    foodType: 'bedtime',
    purpose: 'Inhibits liver cholesterol synthesis overnight and stabilizes arterial walls',
    frequency: '0-0-1 (Once daily at bedtime)',
    doctor: 'Dr. Rajesh Kumar, MD (Endocrinology)',
    docId: 'doc-002',
    sourceDoc: 'Prescription (08 Oct 2026)',
    warning: 'Liver cholesterol production peaks during sleep, making bedtime dosing optimal.',
    color: '#6366F1',
    badgeBg: '#EEF2FF',
  },
];

export const TimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const { patient } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // 0: Daily Timetable, 1: Medical Events, 2: Unified
  const [filterCategory, setFilterCategory] = useState<'all' | 'morning' | 'afternoon' | 'night' | 'weekly'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Synchronized language based on user's top preferred language
  const activeLang = getLanguageOption(patient?.preferred_language);
  const speechLangCode = getSpeechLanguageCode(patient?.preferred_language);

  // Adherence tracking (persistent in localStorage)
  const [takenIds, setTakenIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('med_taken_tablets');
      return saved ? JSON.parse(saved) : ['med-sch-1', 'med-sch-2'];
    } catch {
      return ['med-sch-1', 'med-sch-2'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('med_taken_tablets', JSON.stringify(takenIds));
    } catch (e) {
      console.error(e);
    }
  }, [takenIds]);

  const toggleTaken = (id: string) => {
    setTakenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetTaken = () => {
    setTakenIds([]);
  };

  // Filtered timetable items
  const filteredSchedule = TABLET_SCHEDULE_DATA.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.slotCategory === filterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slotName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalTabletsToday = TABLET_SCHEDULE_DATA.filter((m) => m.slotCategory !== 'weekly').length;
  const takenCount = TABLET_SCHEDULE_DATA.filter(
    (m) => m.slotCategory !== 'weekly' && takenIds.includes(m.id)
  ).length;
  const progressPercent = Math.round((takenCount / totalTabletsToday) * 100);

  // Audio timetable speech synthesis
  const handleToggleAudio = async () => {
    if (isPlayingAudio) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);

    // Multilingual speech scripts
    let scheduleVoiceText =
      'Here is your daily tablet timetable. ' +
      'At 7:00 AM on an empty stomach, take Pantoprazole 40 milligrams. ' +
      'At 8:30 AM after breakfast, take Metformin 500 milligrams. ' +
      'At 1:30 PM after lunch, take B-Complex with Zinc. ' +
      'At 8:30 PM after dinner, take Metformin 500 milligrams. ' +
      'At 10:00 PM at bedtime, take Atorvastatin 10 milligrams with water. ' +
      'On Sunday mornings, take Vitamin D3 60,000 IU.';

    if (activeLang.name === 'Tamil') {
      scheduleVoiceText =
        'உங்கள் தினசரி மருந்து நேர அட்டவணை இதோ. ' +
        'காலை 7:00 மணிக்கு வெறும் வயிற்றில் பான்டோபிரசோல் 40 மில்லிகிராம். ' +
        'காலை உணவுக்குப் பிறகு 8:30 மணிக்கு மெட்ஃபோர்மின் 500 மில்லிகிராம். ' +
        'மதிய உணவுக்குப் பிறகு 1:30 மணிக்கு பி-காம்ப்ளக்ஸ் காப்ஸ்யூல். ' +
        'இரவு உணவுக்குப் பிறகு 8:30 மணிக்கு மெட்ஃபோர்மின் 500 மில்லிகிராம். ' +
        'படுக்கைக்கு முன் இரவு 10:00 மணிக்கு அட்டோர்வாஸ்டாடின் 10 மில்லிகிராம் உட்கொள்ளவும். ' +
        'ஞாயிறு காலை வைட்டமின் டி3 60,000 ஐயு எடுத்துக் கொள்ளவும்.';
    } else if (activeLang.name === 'Hindi') {
      scheduleVoiceText =
        'यहाँ आपकी दैनिक दवा समय-सारणी है। ' +
        'सुबह 7:00 बजे खाली पेट पैंटोप्राज़ोल 40 मिलीग्राम लें। ' +
        'नाश्ते के बाद 8:30 बजे मेटफॉर्मिन 500 मिलीग्राम लें। ' +
        'दोपहर के भोजन के बाद 1:30 बजे बी-कॉम्प्लेक्स कैप्सूल लें। ' +
        'रात के खाने के बाद 8:30 बजे मेटफॉर्मिन 500 मिलीग्राम लें। ' +
        'रात को सोते समय 10:00 बजे एटोरवास्टेटिन 10 मिलीग्राम पानी के साथ लें। ' +
        'रविवार सुबह विटामिन डी3 60,000 आईयू लें।';
    } else if (activeLang.name === 'Telugu') {
      scheduleVoiceText =
        'ఇది మీ రోజువారీ మందుల సమయ పట్టిక. ' +
        'ఉదయం 7:00 గంటలకు ఖాళీ కడుపుతో పాంటోప్రజోల్ 40 మి.గ్రా. ' +
        'అల్పాహారం తర్వాత ఉదయం 8:30 గంటలకు మెట్‌ఫార్మిన్ 500 మి.గ్రా. ' +
        'భోజనం తర్వాత మధ్యాహ్నం 1:30 గంటలకు బి-కాంప్లెక్స్ క్యాప్సూల్. ' +
        'రాత్రి భోజనం తర్వాత 8:30 గంటలకు మెట్‌ఫార్మిన్ 500 మి.గ్రా. ' +
        'నిద్రపోయే ముందు రాత్రి 10:00 గంటలకు అటోర్వాస్టాటిన్ 10 మి.గ్రా నీటితో తీసుకోండి. ' +
        'ఆదివారం ఉదయం విటమిన్ డి3 తీసుకోండి.';
    }

    try {
      const audioUrl = await api.synthesizeSpeech(scheduleVoiceText, activeLang.name);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          fallbackBrowserSpeech(scheduleVoiceText);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    fallbackBrowserSpeech(scheduleVoiceText);
  };

  const fallbackBrowserSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLangCode;
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Prescription':
        return <MedicationRoundedIcon sx={{ color: '#2563EB' }} />;
      case 'Lab Result':
        return <BiotechRoundedIcon sx={{ color: '#06B6D4' }} />;
      case 'Discharge Summary':
        return <LocalHospitalRoundedIcon sx={{ color: '#16A34A' }} />;
      default:
        return <DescriptionRoundedIcon sx={{ color: '#8B5CF6' }} />;
    }
  };

  const getSlotIcon = (category: string) => {
    switch (category) {
      case 'morning':
        return <WbSunnyRoundedIcon sx={{ color: '#F59E0B' }} />;
      case 'afternoon':
        return <WbTwilightRoundedIcon sx={{ color: '#06B6D4' }} />;
      case 'night':
        return <BedtimeRoundedIcon sx={{ color: '#6366F1' }} />;
      case 'weekly':
        return <CalendarMonthRoundedIcon sx={{ color: '#D97706' }} />;
      default:
        return <AccessTimeRoundedIcon sx={{ color: '#64748B' }} />;
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5, pb: 6 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h2" fontWeight={700}>
              Medication Schedule & Health Timeline
            </Typography>
            <Chip
              label={`${activeLang.name} (${activeLang.nativeName})`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, height: 24 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Exact daily tablet timetable with timings, food instructions, clinical indications, and verified doctor prescriptions.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={isPlayingAudio ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            onClick={handleToggleAudio}
            sx={{
              fontWeight: 600,
              bgcolor: isPlayingAudio ? '#FEE2E2' : '#FFFFFF',
              borderColor: isPlayingAudio ? '#EF4444' : '#CBD5E1',
              color: isPlayingAudio ? '#DC2626' : '#1E293B',
              '&:hover': {
                bgcolor: isPlayingAudio ? '#FECACA' : '#F8FAFC',
              },
            }}
          >
            {isPlayingAudio ? 'Stop Voice' : `Listen Timetable (${activeLang.name})`}
          </Button>

          <Button
            variant="contained"
            startIcon={<MedicationRoundedIcon />}
            onClick={() => navigate('/copilot')}
          >
            Ask Copilot About Schedule
          </Button>
        </Box>
      </Box>

      {/* Daily Progress & Summary Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E2E8F0', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                TODAY'S ADHERENCE
              </Typography>
              <Chip
                label={`${progressPercent}%`}
                size="small"
                sx={{
                  bgcolor: progressPercent === 100 ? '#DCFCE7' : '#EFF6FF',
                  color: progressPercent === 100 ? '#166534' : '#1E40AF',
                  fontWeight: 700,
                  height: 22,
                }}
              />
            </Box>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#0F172A', mb: 1 }}>
              {takenCount} / {totalTabletsToday}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                Tablets Taken
              </Typography>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0' }}
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #FEF3C7', bgcolor: '#FFFDF5', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WbSunnyRoundedIcon sx={{ color: '#D97706', fontSize: 20 }} />
              <Typography variant="caption" fontWeight={600} sx={{ color: '#92400E' }}>
                MORNING SLOTS
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#78350F' }}>
              2 Doses Scheduled
            </Typography>
            <Typography variant="caption" sx={{ color: '#B45309' }}>
              07:00 AM Fasting • 08:30 AM Post-Breakfast
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #CFFAFE', bgcolor: '#F0FDFA', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WbTwilightRoundedIcon sx={{ color: '#0891B2', fontSize: 20 }} />
              <Typography variant="caption" fontWeight={600} sx={{ color: '#155E75' }}>
                AFTERNOON SLOT
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#0E7490' }}>
              1 Dose Scheduled
            </Typography>
            <Typography variant="caption" sx={{ color: '#0E7490' }}>
              01:30 PM Post-Lunch (B-Complex)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E0E7FF', bgcolor: '#F5F7FF', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BedtimeRoundedIcon sx={{ color: '#4F46E5', fontSize: 20 }} />
              <Typography variant="caption" fontWeight={600} sx={{ color: '#3730A3' }}>
                NIGHT & BEDTIME
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#312E81' }}>
              2 Doses Scheduled
            </Typography>
            <Typography variant="caption" sx={{ color: '#4338CA' }}>
              08:30 PM Dinner • 10:00 PM Bedtime
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab
            icon={<AccessTimeRoundedIcon />}
            iconPosition="start"
            label="Daily Tablet Timetable (What Time What Medicine)"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            icon={<CalendarMonthRoundedIcon />}
            iconPosition="start"
            label="Medical Event Timeline (Source Reports)"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            icon={<LayersRoundedIcon />}
            iconPosition="start"
            label="Combined Overview"
            sx={{ fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* TAB 0 or TAB 2: TABLET TIME TABLE */}
      {(activeTab === 0 || activeTab === 2) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Controls: Search, Filters & Reset */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {/* Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="All Times (6)"
                clickable
                color={filterCategory === 'all' ? 'primary' : 'default'}
                variant={filterCategory === 'all' ? 'filled' : 'outlined'}
                onClick={() => setFilterCategory('all')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<WbSunnyRoundedIcon sx={{ fontSize: 16 }} />}
                label="Morning (2)"
                clickable
                color={filterCategory === 'morning' ? 'primary' : 'default'}
                variant={filterCategory === 'morning' ? 'filled' : 'outlined'}
                onClick={() => setFilterCategory('morning')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<WbTwilightRoundedIcon sx={{ fontSize: 16 }} />}
                label="Afternoon (1)"
                clickable
                color={filterCategory === 'afternoon' ? 'primary' : 'default'}
                variant={filterCategory === 'afternoon' ? 'filled' : 'outlined'}
                onClick={() => setFilterCategory('afternoon')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<BedtimeRoundedIcon sx={{ fontSize: 16 }} />}
                label="Night & Bedtime (2)"
                clickable
                color={filterCategory === 'night' ? 'primary' : 'default'}
                variant={filterCategory === 'night' ? 'filled' : 'outlined'}
                onClick={() => setFilterCategory('night')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />}
                label="Weekly (1)"
                clickable
                color={filterCategory === 'weekly' ? 'primary' : 'default'}
                variant={filterCategory === 'weekly' ? 'filled' : 'outlined'}
                onClick={() => setFilterCategory('weekly')}
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Search & Reset */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search tablet, condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 220 }}
              />

              <Tooltip title="Reset today's adherence checkmarks">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestartAltRoundedIcon />}
                  onClick={handleResetTaken}
                  sx={{ color: 'text.secondary', borderColor: '#CBD5E1' }}
                >
                  Reset Today
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Clinical Prescription Source Banner */}
          <Card sx={{ bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', p: 1 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <RestaurantRoundedIcon color="primary" sx={{ mt: 0.25 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                    Verified Doctor Instructions & Dietary Guidelines
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1E3A8A', fontSize: '0.85rem' }}>
                    Constructed from Dr. Rajesh Kumar's latest prescription (08 Oct 2026) and CarePoint Hospital discharge summary.
                    Please take tablets with the recommended food status (empty stomach vs. post-meal) to guarantee therapeutic bioavailability and prevent stomach upset.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* The Tablet Time Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid #E2E8F0',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 140 }}>
                    Time & Slot
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 200 }}>
                    Tablet / Medicine
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 110 }}>
                    Dose & Form
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 230 }}>
                    Food & Administration Instruction
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 200 }}>
                    Clinical Purpose / Condition
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 100 }}>
                    Frequency
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155', minWidth: 120, textAlign: 'center' }}>
                    Adherence
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredSchedule.map((row) => {
                  const isTaken = takenIds.includes(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        bgcolor: isTaken ? 'rgba(240, 253, 244, 0.45)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Time & Slot */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSlotIcon(row.slotCategory)}
                          <Box>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0F172A' }}>
                              {row.time}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {row.slotName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Tablet / Medicine */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#0F172A' }}>
                            {row.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                            {row.genericName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'primary.main',
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={() => navigate(`/records/${row.docId}`)}
                          >
                            Source: {row.sourceDoc}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Dose & Form */}
                      <TableCell>
                        <Chip
                          label={`${row.dosage}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: row.badgeBg,
                            color: row.color,
                            border: `1px solid ${row.color}33`,
                            mb: 0.5,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {row.form}
                        </Typography>
                      </TableCell>

                      {/* Food & Instruction */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.foodType === 'empty-stomach' ? '#B45309' : '#1E293B',
                              fontWeight: row.foodType === 'empty-stomach' ? 600 : 400,
                              lineHeight: 1.4,
                            }}
                          >
                            {row.foodInstruction}
                          </Typography>
                        </Box>
                        {row.warning && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 13, color: '#64748B' }} />
                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.72rem' }}>
                              {row.warning}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      {/* Purpose */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.825rem', lineHeight: 1.4 }}>
                          {row.purpose}
                        </Typography>
                      </TableCell>

                      {/* Frequency */}
                      <TableCell>
                        <Chip
                          label={row.frequency}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', height: 22, color: 'text.secondary' }}
                        />
                      </TableCell>

                      {/* Adherence Action */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          size="small"
                          variant={isTaken ? 'contained' : 'outlined'}
                          color={isTaken ? 'success' : 'inherit'}
                          startIcon={
                            isTaken ? (
                              <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16 }} />
                            )
                          }
                          onClick={() => toggleTaken(row.id)}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            py: 0.4,
                            px: 1.2,
                            textTransform: 'none',
                          }}
                        >
                          {isTaken ? 'Taken' : 'Mark Taken'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1 or TAB 2: MEDICAL EVENT TIMELINE */}
      {(activeTab === 1 || activeTab === 2) && (
        <Box sx={{ position: 'relative', pl: { xs: 2, sm: 4 }, mt: activeTab === 2 ? 3 : 0 }}>
          {activeTab === 2 && (
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: '#0F172A' }}>
              Chronological Health History & Source Documents
            </Typography>
          )}

          {/* Vertical line indicator */}
          <Box
            sx={{
              position: 'absolute',
              left: { xs: 15, sm: 31 },
              top: 10,
              bottom: 10,
              width: 2,
              bgcolor: '#E2E8F0',
              zIndex: 0,
            }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {TIMELINE_EVENTS.map((event) => (
              <Box
                key={event.id}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  gap: 2.5,
                  zIndex: 1,
                }}
              >
                {/* Dot Icon */}
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: '#FFFFFF',
                    border: '2px solid #CBD5E1',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)',
                    alignSelf: 'flex-start',
                    mt: 0.5,
                  }}
                >
                  {getEventIcon(event.doc_type)}
                </Avatar>

                {/* Event Card */}
                <Card
                  sx={{
                    flexGrow: 1,
                    p: 2,
                    transition: 'transform 0.15s ease',
                    '&:hover': { transform: 'translateX(4px)', borderColor: 'primary.main' },
                  }}
                >
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                          {event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.date} • {event.doctor}
                        </Typography>
                      </Box>
                      <ConfidenceBadge score={event.confidence} />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {event.summary}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {event.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.75rem', bgcolor: '#F8FAFC' }} />
                        ))}
                      </Box>

                      <Button
                        size="small"
                        variant="text"
                        endIcon={<ArrowForwardRoundedIcon />}
                        onClick={() => navigate(`/records/${event.doc_id}`)}
                      >
                        View Source Document
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
