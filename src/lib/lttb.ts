// Largest Triangle Three Buckets — decimate (x, y) series to target point count.
export function lttb(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  target: number,
): { xs: number[]; ys: number[] } {
  const n = xs.length;
  if (n === 0) return { xs: [], ys: [] };
  if (target >= n || target < 3) {
    return {
      xs: Array.from(xs as ArrayLike<number>),
      ys: Array.from(ys as ArrayLike<number>),
    };
  }
  const outX: number[] = new Array(target);
  const outY: number[] = new Array(target);
  let outIdx = 0;
  outX[outIdx] = xs[0];
  outY[outIdx] = ys[0];
  outIdx++;

  const bucketSize = (n - 2) / (target - 2);
  let a = 0;
  for (let i = 0; i < target - 2; i++) {
    const startNext = Math.floor((i + 1) * bucketSize) + 1;
    const endNext = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    const lenNext = Math.max(1, endNext - startNext);
    let avgX = 0;
    let avgY = 0;
    for (let j = startNext; j < endNext; j++) {
      avgX += xs[j];
      avgY += ys[j];
    }
    avgX /= lenNext;
    avgY /= lenNext;

    const start = Math.floor(i * bucketSize) + 1;
    const end = Math.floor((i + 1) * bucketSize) + 1;
    let maxArea = -1;
    let nextA = a;
    const aX = xs[a];
    const aY = ys[a];
    for (let j = start; j < end; j++) {
      const area =
        Math.abs(
          (aX - avgX) * (ys[j] - aY) - (aX - xs[j]) * (avgY - aY),
        ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        nextA = j;
      }
    }
    outX[outIdx] = xs[nextA];
    outY[outIdx] = ys[nextA];
    outIdx++;
    a = nextA;
  }
  outX[outIdx] = xs[n - 1];
  outY[outIdx] = ys[n - 1];
  return { xs: outX, ys: outY };
}
