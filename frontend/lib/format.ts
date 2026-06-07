export type PKRFormatStyle = "phrase" | "numeric";

interface PKROptions {
  style?: PKRFormatStyle; // default: "phrase"
}

const CRORE = 1_00_00_000;
const LAKH = 1_00_000;
const THOUSAND = 1_000;

/**
 * Format a PKR rupee value.
 * Default style is "phrase": Pakistani crore/lakh phrasing (e.g. "1 crore 25 lakh").
 * Style "numeric" returns "₨ X,XX,XX,XXX" with Indian grouping.
 */
export function formatPKR(value: number, opts: PKROptions = {}): string {
  const style = opts.style ?? "phrase";

  if (style === "numeric") {
    // Indian grouping: last 3 digits, then every 2
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(Math.round(value));
    const str = abs.toString();
    const lastThree = str.slice(-3);
    const rest = str.slice(0, -3);
    const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    const formatted = rest ? `${groupedRest},${lastThree}` : lastThree;
    return `₨ ${sign}${formatted}`;
  }

  // phrase style
  if (value === 0) return "0";

  const sign = value < 0 ? "-" : "";
  let remainder = Math.abs(Math.round(value));

  // under one lakh — plain rupees with comma grouping
  if (remainder < LAKH) {
    return `${sign}${remainder.toLocaleString("en-PK")}`;
  }

  const parts: string[] = [];

  const crores = Math.floor(remainder / CRORE);
  remainder -= crores * CRORE;
  if (crores > 0) parts.push(`${crores} crore`);

  const lakhs = Math.floor(remainder / LAKH);
  remainder -= lakhs * LAKH;
  if (lakhs > 0) parts.push(`${lakhs} lakh`);

  const thousands = Math.floor(remainder / THOUSAND);
  remainder -= thousands * THOUSAND;
  if (thousands > 0) parts.push(`${thousands} thousand`);

  if (remainder > 0) {
    parts.push(`${remainder}`);
  }

  return sign + parts.join(" ");
}

interface NumberOptions {
  precision?: number;
}

export function formatNumber(value: number, opts: NumberOptions = {}): string {
  const precision = opts.precision ?? 0;
  const fixed = value.toFixed(precision);
  const num = parseFloat(fixed);
  return num.toLocaleString("en-PK", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
