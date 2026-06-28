import * as React from 'react';
import { type CycleData, getMedian } from '@/lib/cycle-types';

interface CycleLengthChartProps {
  data: CycleData[];
}

export function CycleLengthChart({ data }: CycleLengthChartProps) {
  // Requirements: < 3 cycles -> empty state
  if (data.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-muted/40 rounded-2xl border border-border/30">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <span className="text-xl font-bold text-muted-foreground">?</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Not enough data yet</p>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Log at least 3 complete cycles to see your cycle length trend.
        </p>
      </div>
    );
  }

  // Chart Dimensions
  const height = 160;
  const width = 300; // viewBox width
  const padding = { top: 20, bottom: 20, left: 10, right: 10 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  // Data Processing
  // Take last 12 cycles max for readability
  const recentData = data.slice(-12);
  const lengths = recentData.map((d) => d.length);

  // Y-Axis Scale (Dynamic range with padding)
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const yMin = Math.max(20, minLen - 2); // Floor at 20
  const yMax = maxLen + 2;
  const yRange = yMax - yMin;

  const getY = (val: number) => {
    return padding.top + chartHeight - ((val - yMin) / yRange) * chartHeight;
  };

  // X-Axis Scale
  const xStep = chartWidth / (recentData.length - 1 || 1);
  const getX = (index: number) => padding.left + index * xStep;

  // Median Line
  const median = getMedian(lengths);
  const medianY = getY(median);

  // Path Generation
  const points = recentData.map((d, i) => `${getX(i)},${getY(d.length)}`).join(' ');

  // Insight Text Logic
  const variance = maxLen - minLen;
  let insightText = 'Your cycle length varies significantly.';
  if (variance <= 2) insightText = 'Your cycle length is highly consistent.';
  else if (variance <= 5) insightText = 'Your cycle length has strayed within a narrow range.';

  // X-Axis Labels Logic
  // Show label for first, last, and points in between to avoid crowding
  // Simple heuristic: Show max 5 labels evenly distributed
  const labelInterval = Math.ceil(recentData.length / 5);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-semibold text-foreground tracking-tight">Cycle Length</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed">{insightText}</p>
      </div>

      <div className="relative w-full aspect-[2/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Median Line - Dashed */}
          <line
            x1={padding.left}
            y1={medianY}
            x2={width - padding.right}
            y2={medianY}
            className="stroke-zinc-300 dark:stroke-zinc-600 stroke-[1] [stroke-dasharray:4,4]"
          />
          <text
            x={width - padding.right + 4}
            y={medianY + 3}
            className="fill-zinc-400 text-[10px] font-medium hidden sm:block"
          >
            {median}d
          </text>

          {/* Main Trend Line */}
          <polyline
            points={points}
            fill="none"
            className="stroke-blue-500 stroke-[2.5]"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Labels */}
          {recentData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.length);
            const showXLabel = i === 0 || i === recentData.length - 1 || i % labelInterval === 0;
            // Fix timezone issue: Parse YYYY-MM-DD manually
            const monthIndex = parseInt(d.startDate.split('-')[1], 10) - 1;
            const dateLabel = new Date(2000, monthIndex, 1).toLocaleDateString('en-US', {
              month: 'short',
            });

            return (
              <g key={d.id} className="group cursor-pointer">
                {/* Invisible touch target */}
                <circle cx={cx} cy={cy} r="12" fill="transparent" />

                {/* Visible Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  className="fill-white dark:fill-zinc-900 stroke-blue-500 stroke-[2.5] transition-all duration-200"
                />

                {/* Permanent Value Label */}
                <g className="transition-opacity duration-200">
                  {/* Optional: Add a small background if needed for contrast, but clean text usually looks better if not overlapping */}
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    className="fill-zinc-700 dark:fill-zinc-300 text-[10px] font-bold"
                  >
                    {d.length}
                  </text>
                </g>

                {/* X-Axis Label */}
                {showXLabel && (
                  <text
                    x={cx}
                    y={height - 2}
                    textAnchor="middle"
                    className="fill-zinc-400 text-[10px] font-medium"
                  >
                    {dateLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
