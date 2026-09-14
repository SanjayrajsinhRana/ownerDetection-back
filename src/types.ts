export interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  plateNumber: string;
  normalizedPlate: string;
  department: string;
  phone: string;
  carModel: string;
  parkingBay: string;
  avatar?: string;
  notes?: string;
}

export interface ScanResult {
  plateNumber: string;
  normalizedPlate: string;
  confidence: number;
  vehicleDetails?: string;
  rawTextDetected?: string;
  alternatives?: string[];
  engine: string;
}

export interface ColleagueMatch {
  employee: EmployeeRecord;
  matchType: 'exact' | 'fuzzy';
  score: number;
}

export interface HuggingFaceSettings {
  apiKey: string;
  model: string;
  preferredEngine: 'huggingface' | 'auto' | 'gemini';
}

export interface GoogleSheetState {
  url: string;
  isConnected: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  error: string | null;
  recordsCount: number;
}
