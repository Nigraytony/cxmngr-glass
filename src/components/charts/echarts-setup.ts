// Tree-shaken ECharts registration. Import only the chart types and
// components we actually render so the bundle doesn't pull in the full
// ~900 KB ECharts payload.
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart,
  LineChart,
  HeatmapChart,
  PieChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent,
  AxisPointerComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  HeatmapChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent,
  AxisPointerComponent,
])

// Shared palette + base theme so every widget has a consistent look.
export const palette = {
  blue: '#60a5fa',
  indigo: '#818cf8',
  violet: '#a78bfa',
  amber: '#fbbf24',
  emerald: '#34d399',
  cyan: '#22d3ee',
  rose: '#fb7185',
  slate: '#94a3b8',
  orange: '#f97316',
  green: '#22c55e',
  red: '#ef4444',
}

export const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  axisTick: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  axisLabel: { color: 'rgba(255,255,255,0.75)' },
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
}

export const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  borderColor: 'rgba(255,255,255,0.15)',
  borderWidth: 1,
  textStyle: { color: 'rgba(255,255,255,0.95)' },
  extraCssText: 'backdrop-filter: blur(8px); border-radius: 12px;',
}
