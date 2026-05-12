import uPlot, { type AlignedData, type Options } from "uplot";
import "uplot/dist/uPlot.min.css";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function UPlotChart({
  data,
  series,
  height = 240,
  yLabel,
}: {
  data: AlignedData;
  series: { label: string; stroke?: string; fill?: string }[];
  height?: number;
  yLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const { theme } = useTheme();
  const dark = theme === "dark";

  useEffect(() => {
    if (!ref.current) return;
    const grid = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const stroke = dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
    const opts: Options = {
      width: ref.current.clientWidth,
      height,
      scales: { x: { time: false } },
      axes: [
        { stroke, grid: { stroke: grid } },
        { stroke, grid: { stroke: grid }, label: yLabel },
      ],
      series: [
        { label: "t" },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.stroke ?? "var(--color-primary)",
          fill: s.fill,
          width: 1.5,
        })),
      ],
    };
    plotRef.current?.destroy();
    plotRef.current = new uPlot(opts, data, ref.current);
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      if (!plotRef.current || !el) return;
      plotRef.current.setSize({ width: el.clientWidth, height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [dark, height, yLabel, JSON.stringify(series.map((s) => s.label))]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
