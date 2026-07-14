"use client"

// Presentational chart primitives for the admin overview, built on recharts v3.
// They are deliberately "dumb": the panel passes already-localized labels and
// plain numbers, so nothing here touches i18n or the API. recharts is heavy and
// browser-only, so the panel loads this module via next/dynamic (ssr: false).

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// Cycles the theme's five chart tokens (defined in globals.css for both themes).
const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const

export type CategoryDatum = { label: string; count: number }
export type TrendDatum = { label: string; count: number }

type TooltipDatum = { name?: string; value?: number | string; color?: string }

// A theme-consistent tooltip card — replaces recharts' default white box so it
// reads correctly in both light and dark mode.
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipDatum[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  const first = payload[0]
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{first?.value}</p>
    </div>
  )
}

// New-per-day area chart over the trailing window (signups / listings).
export function TrendAreaChart({ data, color }: { data: TrendDatum[]; color?: string }) {
  const stroke = color ?? PALETTE[0]
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`trend-${stroke}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={32}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)" }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#trend-${stroke})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Horizontal bars for a categorical breakdown; each bar takes the next palette color.
export function CategoryBarChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Donut for a small categorical split (asset / transaction type).
export function CategoryDonut({ data }: { data: CategoryDatum[] }) {
  const nonEmpty = data.filter((d) => d.count > 0)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Pie
          data={nonEmpty}
          dataKey="count"
          nameKey="label"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {nonEmpty.map((entry, index) => (
            <Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
