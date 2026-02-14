
export interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  sourceVersion?: string; // To track which JSON it came from
  id: string; // Unique identifier
}

export interface QuizConfig {
  selectedVersions: string[];
  questionCount: number;
  timeLimitMinutes: number;
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>; // questionId -> answer (A, B, C, D)
  timeLeftSeconds: number;
  isComplete: boolean;
  score: number;
}

export enum AppStage {
  LOGIN = 'LOGIN',
  LOADING = 'LOADING',
  MENU = 'MENU',
  SETUP = 'SETUP',
  STUDY = 'STUDY',
  QUIZ = 'QUIZ',
  RESULT = 'RESULT'
}

export interface DataSource {
  id: string;
  name: string;
  url?: string;
  data?: any[]; // Pre-loaded data
}

export interface Dataset extends DataSource {
  data: any[]; // Data must be present in loaded dataset
}

export interface PdfDocument {
  id: string;
  title: string;
  link: string; // External link (e.g. Google Drive)
  description?: string;
}
