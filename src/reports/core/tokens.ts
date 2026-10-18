// Brand tokens for generated reports. The single source of truth stays in
// utils/reportTypography (it predates this kit and is imported app-wide);
// report code should import from here so the kit is self-contained.
export {
  SANS,
  MONO,
  COLORS,
  SIZES,
  setColor,
  setFill,
  setDraw,
  coverTitle,
  coverSubtitle,
  runningTitle,
  h1,
  h2,
  h3,
  h4,
  h5,
  body,
  bodyBold,
  italic,
  caption,
  tableHeader,
  tableCell,
  mono,
  footer,
  useSans,
  useMono,
  REPORT_FONT_STACK,
  REPORT_MONO_STACK,
  REPORT_FONT_NAME,
} from '../../utils/reportTypography'
export type { ColorToken } from '../../utils/reportTypography'
