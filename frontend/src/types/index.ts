export interface Patient {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  abha_id?: string;
  preferred_language?: string;
  created_at?: string;
}

export interface DocumentRecord {
  id: string;
  patient_id?: string;
  filename: string;
  doc_type: 'Prescription' | 'Lab Report' | 'Discharge Summary' | 'Diagnostic Report' | 'Other';
  created_at: string;
  status: 'Verified' | 'Review' | 'Needs Confirmation' | 'Processed';
  confidence_score: number; // 0 to 1 or 0 to 100
  summary?: string;
  source_file_path?: string;
  extracted_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  schedule: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  instruction: string;
  duration: string;
  confidence: number;
  status: 'Verified' | 'Needs Review' | 'Active' | 'Discontinued';
  prescribed_by?: string;
  prescribed_date?: string;
}

export interface LabResultItem {
  id: string;
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'NORMAL' | 'LOW' | 'HIGH';
  date: string;
  document_name?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  event_type: 'Prescription' | 'Lab Result' | 'Clinical Note' | 'Discharge Summary' | 'Diagnostic Report';
  title: string;
  doctor_or_lab?: string;
  summary: string;
  confidence: number;
  document_id?: string;
  tags?: string[];
}

export interface CopilotCitation {
  document_id?: string;
  document_name?: string;
  date?: string;
  confidence?: number;
  snippet?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: CopilotCitation[];
  confidence?: number;
  audio_url?: string;
  is_voice_query?: boolean;
}

export interface WorkspaceOverview {
  patient: Patient;
  total_documents: number;
  total_medications: number;
  total_lab_tests: number;
  recent_summary?: string;
  recent_records: DocumentRecord[];
  active_medications: MedicationItem[];
  timeline: TimelineEvent[];
}
