// Number formatting for instrument readouts.

export function fmtCount(n: number): string {
  if (!isFinite(n)) return '—';
  if (n < 0.5) return '0';
  if (n < 1000) return Math.round(n).toString();
  if (n < 1e6) return `${(n / 1e3).toPrecision(3)} K`;
  if (n < 1e9) return `${(n / 1e6).toPrecision(3)} M`;
  return `${(n / 1e9).toPrecision(3)} B`;
}

export function fmtUsd(n: number): string {
  if (!isFinite(n) || n < 1) return '$0';
  if (n < 1e6) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n < 1e9) return `$${(n / 1e6).toPrecision(3)} M`;
  if (n < 1e12) return `$${(n / 1e9).toPrecision(3)} B`;
  if (n < 1e15) return `$${(n / 1e12).toPrecision(3)} T`;
  return `$${(n / 1e15).toPrecision(3)} Q`;
}

export function fmtEnergy(mt: number): string {
  if (mt < 1e-3) return `${sig3(mt * 1e6)} t TNT`;
  if (mt < 1) return `${sig3(mt * 1e3)} kt`;
  if (mt < 1e6) return `${sig3(mt)} Mt`;
  return `${sig3(mt / 1e6)} M·Mt`;
}

/** 3 significant figures without scientific notation. */
export function sig3(n: number): string {
  if (n === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(n)));
  const rounded = Number(n.toPrecision(3));
  return mag >= 3 ? Math.round(rounded).toLocaleString('en-US') : String(rounded);
}

export function fmtKm(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}
