// Shared pre-download QA warning shape, used by the report QA modal
// (components/reports/ReportQaModal.vue) and each report's check module
// (definitions/activity/qa.ts, definitions/issue/qa.ts, …).

export interface QaWarning {
  /** Stable id so a dismissal survives regeneration (category + refs). */
  id: string
  /** Check category slug (each report module defines its own set). */
  category: string
  message: string
  /** Jump target for the Open button. */
  link?: { type: 'issue' | 'equipment' | 'photos' | 'field'; id: string }
}
