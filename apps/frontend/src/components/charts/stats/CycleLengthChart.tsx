import * as React from 'react';
import { type CycleData, getMedian } from '@/lib/cycle-types';

interface CycleLengthChartProps {
  data: CycleData[];
}

export function CycleLengthChart({ data }: CycleLengthChartProps) {
  // Only settled cycles carry a real length; drop the in-progress one.
  const completed = data.filter((d) => d.complete !== false);

  // Defensive fallback — Stats only mounts this at ≥3 completed cycles.
  if (completed.length < 3) {
    return (
      <p className="text-[13px] text-muted-foreground text-center py-8">
        Not enough completed cycles yet.
      </p>
    );
  }

  // Chart Dimensions
  const height = 160;
  const width = 300; // viewBox width
  const padding = { top: 22, bottom: 22, left: 12, right: 12 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  // Take last 12 cycles max for readability.
  const recentData = completed.slice(-12);
  const lengths = recentData.map((d) => d.length);

  // Y-Axis Scale (dynamic range with padding).
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const yMin = Math.max(20, minLen - 2); // Floor at 20
  const yMax = maxLen + 2;
  const yRange = yMax - yMin;

  const getY = (val: number) => padding.top + chartHeight - ((val - yMin) / yRange) * chartHeight;
  const xStep = chartWidth / (recentData.length - 1 || 1);
  const getX = (index: number) => padding.left + index * xStep;

  const median = getMedian(lengths);
  const medianY = getY(median);

  // Typical-range band (min…max) — lets consistency read at a glance.
  const bandTop = getY(maxLen);
  const bandBottom = getY(minLen);

  // Line + area-fill paths.
  const linePoints = recentData.map((d, i) => `${getX(i)},${getY(d.length)}`).join(' ');
  const areaPath =
    `M${getX(0)},${getY(recentData[0].length)} ` +
    recentData
      .slice(1)
      .map((d, i) => `L${getX(i + 1)},${getY(d.length)}`)
      .join(' ') +
    ` L${getX(recentData.length - 1)},${height - padding.bottom} L${getX(0)},${height - padding.bottom} Z`;

  // Insight takeaway.
  const variance = maxLen - minLen;
  let insightText = 'Your cycle length varies month to month.';
  if (variance <= 2) insightText = 'Your cycle length is highly consistent.';
  else if (variance <= 5) insightText = 'Your cycle length stays within a narrow range.';

  // Label only the meaningful points: shortest, longest, and latest.
  const minIdx = lengths.indexOf(minLen);
  const maxIdx = lengths.lastIndexOf(maxLen);
  const lastIdx = recentData.length - 1;
  const labeled = [minIdx, maxIdx, lastIdx].filter((v, i, a) => a.indexOf(v) === i);

  // X-axis month labels — first, last, and a few between.
  const labelInterval = Math.ceil(recentData.length / 5);

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground leading-snug">{insightText}</p>

      <div className="relative w-full aspect-[2/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Typical-range band */}
          <rect
            x={padding.left}
            y={bandTop}
            width={chartWidth}
            height={Math.max(0, bandBottom - bandTop)}
            rx="4"
            className="fill-zinc-300 dark:fill-zinc-700"
            fillOpacity={0.3}
          />

          {/* Median reference */}
          <line
            x1={padding.left}
            y1={medianY}
            x2={width - padding.right}
            y2={medianY}
            className="stroke-zinc-400/70 dark:stroke-zinc-500/70"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={width - padding.right}
            y={medianY - 4}
            textAnchor="end"
            className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-semibold"
          >
            median {median}d
          </text>

          {/* Area fill */}
          <path d={areaPath} className="fill-blue-500" fillOpacity={0.1} />

          {/* Trend line */}
          <polyline
            points={linePoints}
            fill="none"
            className="stroke-blue-500"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Labeled points + x-axis */}
          {recentData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.length);
            const isLabeled = labeled.includes(i);
            const showXLabel = i === 0 || i === lastIdx || i % labelInterval === 0;
            const monthIndex = parseInt(d.startDate.split('-')[1], 10) - 1;
            const dateLabel = new Date(2000, monthIndex, 1).toLocaleDateString('en-US', {
              month: 'short',
            });

            return (
              <g key={d.id}>
                {isLabeled && (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      className={
                        i === lastIdx
                          ? 'fill-blue-500'
                          : 'fill-white dark:fill-zinc-900 stroke-blue-500'
                      }
                      strokeWidth={2.5}
                    />
                    <text
                      x={cx}
                      y={i === minIdx ? cy + 15 : cy - 11}
                      textAnchor="middle"
                      className="fill-foreground text-[10px] font-bold"
                    >
                      {d.length}
                    </text>
                  </>
                )}
                {showXLabel && (
                  <text
                    x={cx}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-zinc-400 dark:fill-zinc-500 text-[9.5px] font-medium"
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
