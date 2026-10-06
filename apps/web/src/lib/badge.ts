const COLORS = {
  critical: "#e5484d",
  atRisk: "#db922f",
  good: "#4f9ce8",
  ready: "#2c9b5e",
  empty: "#687386",
} as const;

export function isBadgeIdentifier(value: string): boolean {
  return (
    value.length <= 100 &&
    /^[A-Za-z0-9_.-]+$/.test(value) &&
    value !== "." &&
    value !== ".."
  );
}

export function renderScoreBadge(score?: number): string {
  const validScore =
    Number.isInteger(score) &&
    score !== undefined &&
    score >= 0 &&
    score <= 100;
  const label = "ProdCheck";
  const value = validScore ? `${score}/100` : "not scanned";
  const color = !validScore
    ? COLORS.empty
    : score < 40
      ? COLORS.critical
      : score < 70
        ? COLORS.atRisk
        : score < 90
          ? COLORS.good
          : COLORS.ready;
  const labelWidth = 67;
  const valueWidth = validScore ? 47 : 78;
  const width = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="ProdCheck score ${value}"><title>ProdCheck score ${value}</title><linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><path fill="#303846" d="M0 0h${labelWidth}v20H0z"/><path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/><path fill="url(#g)" d="M0 0h${width}v20H0z"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11"><text x="${labelWidth / 2}" y="15">${label}</text><text x="${labelWidth + valueWidth / 2}" y="15">${value}</text></g></svg>`;
}
