import type {
  FacilitatorRecommendation,
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

export function generateRecommendation(
  response: StudentResponse,
): FacilitatorRecommendation {
  const indicators: SupportIndicator[] = [];

  if (!response.isCorrect) {
    indicators.push({
      id: "accuracy",
      label: "Incorrect response",
      severity: "high",
      evidence: "The selected answer did not match the target response.",
    });
  }

  if (response.confidence <= 2) {
    indicators.push({
      id: "low-confidence",
      label: "Low confidence",
      severity: response.isCorrect ? "medium" : "high",
      evidence: `Confidence rating was ${response.confidence} out of 5.`,
    });
  }

  if (response.hintCount > 0) {
    indicators.push({
      id: "hint-use",
      label: "Hint requested",
      severity: response.hintCount > 1 ? "medium" : "low",
      evidence: `The student used ${response.hintCount} hint${
        response.hintCount === 1 ? "" : "s"
      }.`,
    });
  }

  if (response.rereadCount >= 2) {
    indicators.push({
      id: "rereading",
      label: "Repeated rereading",
      severity: "medium",
      evidence: `The passage was reread ${response.rereadCount} times.`,
    });
  }

  if (response.attemptCount > 1) {
    indicators.push({
      id: "multiple-attempts",
      label: "Answer changed",
      severity: "medium",
      evidence: `The student changed their answer ${response.attemptCount - 1} time${
        response.attemptCount === 2 ? "" : "s"
      } before submitting.`,
    });
  }

  if (response.timeOnTaskSeconds > 180) {
    indicators.push({
      id: "extended-time",
      label: "Extended time on task",
      severity: "medium",
      evidence: `Time on task was ${secondsToLabel(response.timeOnTaskSeconds)}.`,
    });
  }

  if (indicators.length === 0) {
    indicators.push({
      id: "secure-progress",
      label: "Secure progress",
      severity: "low",
      evidence: "The response was correct with no additional support signals.",
    });
  }

  const highConcern = indicators.some((indicator) => indicator.severity === "high");
  const needsCheckIn = highConcern || indicators.length >= 3;

  return {
    id: crypto.randomUUID(),
    studentName: response.studentName,
    activityId: response.activityId,
    createdAt: response.submittedAt,
    indicators,
    summary: needsCheckIn
      ? "Prioritise a short facilitator check-in."
      : response.isCorrect
        ? "Student appears ready to continue."
        : "Review the main idea strategy before the next task.",
    action: needsCheckIn
      ? "Ask the student to explain how they chose their answer, then model identifying repeated details that point to the main idea."
      : response.isCorrect
        ? "Give brief positive feedback and offer the next literacy task."
        : "Prompt the student to reread the passage and identify the detail that appears across the whole text.",
  };
}
