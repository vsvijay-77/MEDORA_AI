import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CopilotPage } from '../pages/CopilotPage';
import { Header } from '../components/layout/Header';
import { MetricCard } from '../components/common/MetricCard';
import { StatusChip } from '../components/common/StatusChip';
import { TimelinePage, TABLET_SCHEDULE_DATA } from '../pages/TimelinePage';
import { ALL_LANGUAGES, getSpeechLanguageCode, getLanguageOption } from '../types/languages';
import { api, isIrrelevantOrGreeting, hasMedicalKeyword } from '../api';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <BrowserRouter>{ui}</BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('MEDORA AI Frontend Core Components', () => {
  it('renders MetricCard with label and value correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <MetricCard
          label="Medical Records"
          value={24}
          icon={<FolderSharedRoundedIcon data-testid="folder-icon" />}
          trend="+2 added this week"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Medical Records')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('+2 added this week')).toBeInTheDocument();
    expect(screen.getByTestId('folder-icon')).toBeInTheDocument();
  });

  it('renders StatusChip with correct semantic states', () => {
    const { rerender } = render(<StatusChip status="Verified" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();

    rerender(<StatusChip status="HIGH" />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();

    rerender(<StatusChip status="LOW" />);
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('renders Login page with split-screen branding and Google auth', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Your medical records/i)).toBeInTheDocument();
    expect(screen.getByText(/finally understandable/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your health vault/i)).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('renders Dashboard page with welcome greeting and quick actions', async () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/Good morning/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Health Summary/i)).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Explain Prescription')).toBeInTheDocument();
    expect(screen.getByText('Ask Health Copilot')).toBeInTheDocument();
  });

  it('renders AI Health Copilot with prescription explainer and upload buttons', () => {
    renderWithProviders(<CopilotPage />);
    expect(screen.getByText('AI Health Copilot')).toBeInTheDocument();
    expect(screen.getByText('Explain Prescription')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('renders all 23 scheduled languages in Header selector', () => {
    renderWithProviders(<Header onToggleSidebar={() => {}} title="Dashboard Overview" />);
    expect(ALL_LANGUAGES.length).toBe(23);
    expect(ALL_LANGUAGES.some((l) => l.name === 'Tamil')).toBe(true);
    expect(ALL_LANGUAGES.some((l) => l.name === 'Hindi')).toBe(true);
    expect(ALL_LANGUAGES.some((l) => l.name === 'Telugu')).toBe(true);
  });

  it('renders Timeline page with daily tablet timetable showing what time what medicine to take', () => {
    renderWithProviders(<TimelinePage />);
    expect(screen.getByText(/Medication Schedule & Health Timeline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Daily Tablet Timetable/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pantoprazole')).toBeInTheDocument();
    expect(screen.getAllByText('Metformin Hydrochloride').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Atorvastatin')).toBeInTheDocument();
    expect(screen.getByText('07:00 AM')).toBeInTheDocument();
    expect(screen.getByText('08:30 AM')).toBeInTheDocument();
    expect(screen.getByText('10:00 PM')).toBeInTheDocument();
    expect(screen.getAllByText(/Empty Stomach/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TODAY'S ADHERENCE/i)).toBeInTheDocument();
    expect(TABLET_SCHEDULE_DATA.length).toBe(6);
  });

  it('generates distinct, question-specific clinical answers without repetitive output', async () => {
    const resMetformin = await api.askCopilot('test-patient', 'What is Metformin used for and what is the dose?');
    const resHemoglobin = await api.askCopilot('test-patient', 'Why is my hemoglobin flagged low in the lab report?');
    const resAtorvastatin = await api.askCopilot('test-patient', 'Why do I take Atorvastatin at bedtime?');

    // Verify answers are strictly distinct and question-specific
    expect(resMetformin.answer).toContain('Metformin Hydrochloride');
    expect(resMetformin.answer).not.toContain('HMG-CoA reductase inhibitor');

    expect(resHemoglobin.answer).toContain('Hemoglobin (Hb) Diagnostic Findings');
    expect(resHemoglobin.answer).toContain('10.2 g/dL');

    expect(resAtorvastatin.answer).toContain('Atorvastatin (10 mg) Clinical Explanation');
    expect(resAtorvastatin.answer).toContain('HMG-CoA reductase inhibitor');
  });

  it('maps top preferred language dynamically to BCP-47 locale tags for STT and TTS', () => {
    expect(getSpeechLanguageCode('Tamil')).toBe('ta-IN');
    expect(getSpeechLanguageCode('Hindi')).toBe('hi-IN');
    expect(getSpeechLanguageCode('Telugu')).toBe('te-IN');
    expect(getSpeechLanguageCode('Kannada')).toBe('kn-IN');
    expect(getSpeechLanguageCode('Bengali')).toBe('bn-IN');
    expect(getSpeechLanguageCode('Malayalam')).toBe('ml-IN');
    expect(getSpeechLanguageCode('English')).toBe('en-IN');
    expect(getSpeechLanguageCode('Marathi')).toBe('mr-IN');
    expect(getSpeechLanguageCode('Gujarati')).toBe('gu-IN');
    expect(getSpeechLanguageCode('Punjabi')).toBe('pa-IN');
    expect(getSpeechLanguageCode('Odia')).toBe('or-IN');

    const tamilOpt = getLanguageOption('Tamil');
    expect(tamilOpt.nativeName).toBe('தமிழ்');
    expect(tamilOpt.code).toBe('ta-IN');

    const hindiOpt = getLanguageOption('Hindi');
    expect(hindiOpt.nativeName).toBe('हिंदी');
    expect(hindiOpt.code).toBe('hi-IN');
  });

  it('detects irrelevant queries like "hi how are you" and guides user to ask relevant health questions', async () => {
    // 1. Direct test of query classifier
    expect(isIrrelevantOrGreeting('hi')).toBe(true);
    expect(isIrrelevantOrGreeting('hello')).toBe(true);
    expect(isIrrelevantOrGreeting('hi how are you')).toBe(true);
    expect(isIrrelevantOrGreeting('how are you')).toBe(true);
    expect(isIrrelevantOrGreeting('tell me a joke')).toBe(true);
    expect(isIrrelevantOrGreeting('what is the weather today?')).toBe(true);

    // Clinical queries must not be irrelevant
    expect(isIrrelevantOrGreeting('What is Metformin?')).toBe(false);
    expect(isIrrelevantOrGreeting('Explain my fasting blood sugar')).toBe(false);
    expect(isIrrelevantOrGreeting('Hi, what medicines should I take?')).toBe(false);
    expect(hasMedicalKeyword('medicine')).toBe(true);

    // 2. Copilot response for irrelevant queries displays relevance guidance
    const resGreeting = await api.askCopilot('test-patient', 'hi how are you');
    expect(resGreeting.answer).toContain('MEDORA AI');
    expect(resGreeting.answer).toContain('relevant health and medical questions');
    expect(resGreeting.isRelevancePrompt).toBe(true);
    expect(resGreeting.suggestedQueries).toBeDefined();
    expect(resGreeting.suggestedQueries!.length).toBeGreaterThan(0);

    // In Tamil
    const resTamil = await api.askCopilot('test-patient', 'வணக்கம் எப்படி இருக்கிறீர்கள்', [], 'Tamil');
    expect(resTamil.answer).toContain('MEDORA AI');
    expect(resTamil.answer).toContain('பொருத்தமான கேள்விகளைக் கேளுங்கள்');
    expect(resTamil.isRelevancePrompt).toBe(true);

    // In Hindi
    const resHindi = await api.askCopilot('test-patient', 'नमस्ते आप कैसे हैं', [], 'Hindi');
    expect(resHindi.answer).toContain('MEDORA AI');
    expect(resHindi.answer).toContain('प्रासंगिक प्रश्न पूछें');
    expect(resHindi.isRelevancePrompt).toBe(true);
  });
});
