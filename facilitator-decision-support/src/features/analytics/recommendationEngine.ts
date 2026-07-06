import type {
  FacilitatorRecommendation,
  QuestionResponse,
  StudentResponse,
  SupportIndicator,
} from "@/shared/types/activity";

const secondsToLabel = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

function getQuestionResponses(response: StudentResponse): QuestionResponse[] {
  return Array.isArray(response.questionResponses) ? response.questionResponses : [];
}

export function generateRecommendation(
  response: StudentResponse,
): FacilitatorRecommendation {
  const indicators: SupportIndicator[] = [];
  const questionResponses = getQuestionResponses(response);
  const correctCount = questionResponses.filter((question) => question.isCorrect).length;
  const accuracy =
    questionResponses.length === 0 ? 0 : correctCount / questionResponses.length;
  const totalHints = questionResponses.reduce(
    (total, question) => total + question.hintCount,
    0,
  );
  const totalAnswerChanges = questionResponses.reduce(
    (total, question) => total + question.answerChangeCount,
    0,
  );
  const totalPassageRevisits = questionResponses.reduce(
    (total, question) => total + question.passageRevisitCount,
    0,
  );
  const averageFirstInteractionSeconds = average(
    questionResponses
      .map((question) => question.firstInteractionSeconds)
      .filter((value): value is number => value !== null),
  );
  const averageQuestionTimeSeconds = average(
    questionResponses.map((question) => question.questionTimeSeconds),
  );
  const lowConfidenceCount = questionResponses.filter(
    (question) => question.confidence <= 2,
  ).length;

  const possibleTaskUnderstandingConcern =
    averageFirstInteractionSeconds >= 20 ||
    totalAnswerChanges >= 2 ||
    totalPassageRevisits >= 2 ||
    averageQuestionTimeSeconds >= 75;

  const possibleContentConcern =
    accuracy < 0.75 || (accuracy < 1 && totalHints > 0);
  const possibleSelfEfficacyConcern =
    lowConfidenceCount > 0 ||
    response.overallConfidence <= 2 ||
    response.perceivedDifficulty >= 3;

  if (possibleTaskUnderstandingConcern) {
    indicators.push({
      id: "task-processing",
      label: "Possible task-understanding concern",
      severity: accuracy >= 0.75 ? "medium" : "high",
      evidence: `First answer delay averaged ${secondsToLabel(
        Math.round(averageFirstInteractionSeconds),
      )}; passage revisits: ${totalPassageRevisits}; answer changes: ${totalAnswerChanges}.`,
    });
  }

  if (accuracy < 1) {
    indicators.push({
      id: "accuracy",
      label: "Accuracy concern",
      severity: accuracy < 0.5 ? "high" : "medium",
      evidence: `${correctCount} of ${questionResponses.length} answers were correct.`,
    });
  }

  if (totalHints > 0) {
    indicators.push({
      id: "hint-use",
      label: "Hint used",
      severity: totalHints > 1 ? "medium" : "low",
      evidence: `The student opened ${totalHints} hint${
        totalHints === 1 ? "" : "s"
      }.`,
    });
  }

  if (lowConfidenceCount > 0) {
    indicators.push({
      id: "low-question-confidence",
      label: "Low answer confidence",
      severity: "medium",
      evidence: `${lowConfidenceCount} answer${
        lowConfidenceCount === 1 ? "" : "s"
      } had confidence marked as not sure or guessing.`,
    });
  }

  if (response.perceivedDifficulty >= 3) {
    indicators.push({
      id: "high-difficulty",
      label: "Learner found activity challenging",
      severity: "medium",
      evidence: "The learner reflection marked the activity as challenging.",
    });
  }

  if (response.timeOnTaskSeconds > 240) {
    indicators.push({
      id: "extended-time",
      label: "Extended time on task",
      severity: "medium",
      evidence: `Total activity time was ${secondsToLabel(
        response.timeOnTaskSeconds,
      )}.`,
    });
  }

  if (indicators.length === 0) {
    indicators.push({
      id: "secure-progress",
      label: "Secure progress",
      severity: "low",
      evidence: "The student completed the activity accurately with no major support signals.",
    });
  }

  return {
    id: crypto.randomUUID(),
    studentName: response.studentName,
    activityId: response.activityId,
    createdAt: response.submittedAt,
    indicators,
    summary: possibleTaskUnderstandingConcern
      ? "Review how the student interpreted the task before reteaching content."
      : possibleContentConcern
        ? "Student may need content strategy support."
        : possibleSelfEfficacyConcern
          ? "Student may benefit from confidence-building feedback."
          : "Student appears ready to continue.",
    action: possibleTaskUnderstandingConcern
      ? "Ask the student to explain what the question was asking and how they decided where to look in the passage."
      : possibleContentConcern
        ? "Model using details from the passage to justify the main idea."
        : possibleSelfEfficacyConcern
          ? "Give specific feedback on what the student did successfully, then offer a similar follow-up item."
          : "Offer the next reading activity.",
  };
}
