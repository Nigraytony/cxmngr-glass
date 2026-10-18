// Font embedding for generated reports (IBM Plex Sans + Mono).
// ensureReportFonts embeds into the jsPDF doc that will actually be drawn —
// embedding into a throwaway doc silently falls back to Times.
export { ensureReportFonts, ensureWebReportFontLoaded } from '../../utils/reportTypography'
