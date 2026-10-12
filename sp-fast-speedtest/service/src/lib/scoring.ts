export type SpeedGrade = "Excellent" | "Good" | "Fair" | "Poor";

/**
 * Graded on download speed primarily — the metric most visitors actually
 * care about and compare against their ISP's advertised plan. Upload and
 * latency are reported alongside but don't shift the headline grade, to
 * keep the result easy to read at a glance.
 */
export function gradeSpeed(downloadMbps: number): SpeedGrade {
  if (downloadMbps >= 100) return "Excellent";
  if (downloadMbps >= 50) return "Good";
  if (downloadMbps >= 20) return "Fair";
  return "Poor";
}

export function gradeColor(grade: SpeedGrade): string {
  switch (grade) {
    case "Excellent":
      return "#1A7F37";
    case "Good":
      return "#0072D6";
    case "Fair":
      return "#D89A00";
    case "Poor":
      return "#C4292B";
  }
}
