export type ConfidenceLevel = 1 | 2 | 3 | 4;
export type DifficultyLevel = 1 | 2 | 3;

export type QuestionResponse = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  hintCount: number;
  answerChangeCount: number;
  firstInteractionSeconds: number | null;
  questionTimeSeconds: number;
  passageRevisitCount: number;
};

export type StudentResponse = {
  id: string;
  studentName: string;
  activityId: string;
  readingTimeSeconds: number;
  timeOnTaskSeconds: number;
  questionResponses: QuestionResponse[];
  perceivedDifficulty: DifficultyLevel;
  overallConfidence: ConfidenceLevel;
  completed: boolean;
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
