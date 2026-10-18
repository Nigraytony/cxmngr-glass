// Moved to src/reports/core (frame.ts / images.ts). This shim keeps remaining
// call sites (ActivityEdit) compiling until they migrate onto the report kit
// in Phase 2/3 — new code should import from src/reports/core directly.
export { drawBrandedHeader, drawBrandedFooter } from '../reports/core/frame'
export { fitImageToHeight } from '../reports/core/images'
export type { LoadedImage as PdfImage } from '../reports/core/images'
