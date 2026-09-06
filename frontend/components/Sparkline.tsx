export default function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.01);
  const width = 240;
  const height = 40;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="text-blue-600">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}
