import uPlot, { type AlignedData, type Options } from "uplot";
import "uplot/dist/uPlot.min.css";
import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import type { ModeSegment } from "@/routes/match-detail";
import { Button } from "@/components/ui/button";
import { ZoomOut } from "lucide-react";

const MODE_COLORS: Record<string, string> = {
  auto: "rgba(250,204,21,0.18)",
  teleop: "rgba(96,165,250,0.15)",
  test: "rgba(167,139,250,0.18)",
  disabled: "rgba(120,120,120,0.08)",
};

export function ModeChart({
  data,
  series,
  modeSegments = [],
  height = 240,
  yLabel,
}: {
  data: AlignedData;
  series: { label: string; stroke?: string; fill?: string }[];
  modeSegments?: ModeSegment[];
  height?: number;
  yLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const segsRef = useRef(modeSegments);
  segsRef.current = modeSegments;
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const resetZoom = useCallback(() => {
    const u = plotRef.current;
    if (!u || !u.data[0]?.length) return;
    const xs = u.data[0] as number[];
    u.setScale("x", { min: xs[0], max: xs[xs.length - 1] });
  }, []);

  const buildPlot = useCallback(() => {
    if (!containerRef.current) return;
    plotRef.current?.destroy();
    const grid = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    const axisStroke = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

    const opts: Options = {
      width: containerRef.current.clientWidth,
      height,
      cursor: {
        drag: { x: true, y: false, setScale: true },
      },
      scales: { x: { time: false } },
      axes: [
        { stroke: axisStroke, grid: { stroke: grid }, label: "s" },
        { stroke: axisStroke, grid: { stroke: grid }, label: yLabel },
      ],
      series: [
        { label: "t" },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.stroke ?? "oklch(0.708 0 0)",
          fill: s.fill,
          width: 1.5,
        })),
      ],
      hooks: {
        drawClear: [
          (u) => {
            const ctx = u.ctx;
            const { left, top, width, height: h } = u.bbox;
            ctx.save();
            ctx.beginPath();
            ctx.rect(left, top, width, h);
            ctx.clip();
            for (const seg of segsRef.current) {
              const color = MODE_COLORS[seg.mode];
              if (!color) continue;
              const x1 = Math.round(u.valToPos(seg.start, "x", true));
              const x2 = Math.round(u.valToPos(seg.end, "x", true));
              if (x2 <= x1) continue;
              ctx.fillStyle = color;
              ctx.fillRect(x1, top, x2 - x1, h);
            }
            ctx.restore();
          },
        ],
      },
    };
    plotRef.current = new uPlot(opts, data, containerRef.current);
  }, [dark, height, yLabel, series.map((s) => s.label).join()]);

  // Rebuild plot when theme/config changes.
  useEffect(() => {
    buildPlot();
    const onResize = () => {
      if (!containerRef.current || !plotRef.current) return;
      plotRef.current.setSize({ width: containerRef.current.clientWidth, height });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [buildPlot]);

  // Update data without rebuilding.
  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  // Double-click anywhere on the chart to reset zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (e.detail === 2) resetZoom();
    };
    el.addEventListener("mousedown", handler);
    return () => el.removeEventListener("mousedown", handler);
  }, [resetZoom]);

  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={resetZoom}
        >
          <ZoomOut className="h-3 w-3" />
          Reset zoom
        </Button>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
