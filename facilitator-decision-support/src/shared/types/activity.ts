export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export type StudentResponse = {
  id: string;
  studentName: string;
  activityId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  hintCount: number;
  rereadCount: number;
  attemptCount: number;
  timeOnTaskSeconds: number;
  submittedAt: string;
};

export type SupportIndicator = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  evidence: string;
};

export type FacilitatorRecommendation = {
  id: string;
  studentName: string;
  activityId: string;
  summary: string;
  action: string;
  indicators: SupportIndicator[];
  createdAt: string;
};

export type ActivityResult = {
  response: StudentResponse;
  recommendation: FacilitatorRecommendation;
};
