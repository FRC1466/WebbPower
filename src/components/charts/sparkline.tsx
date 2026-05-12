import { useId } from "react";

export function Sparkline({
  values,
  stroke = "currentColor",
  width = 160,
  height = 36,
}: {
  values: number[];
  stroke?: string;
  width?: number;
  height?: number;
}) {
  const id = useId();
  if (values.length === 0) {
    return (
      <div className="flex h-9 items-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>Trend</title>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
