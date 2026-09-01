export type AutomationReviewStatus = "draft" | "approved";
export type AutomationStatus = "active" | "paused" | "archived";

export function assertCanActivate(reviewStatus: AutomationReviewStatus) {
  if (reviewStatus !== "approved") throw new Error("Automation must be approved before activation");
}

export function resetForReapproval() {
  return {
    reviewStatus: "draft" as const,
    status: "paused" as const,
    approvedAt: null,
  };
}
