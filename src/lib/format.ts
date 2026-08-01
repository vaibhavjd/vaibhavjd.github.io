const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatINR(n: number): string {
  return `₹${inr.format(Math.round(n))}`;
}

export function formatTat(hours: number): string {
  if (hours <= 24) return `${hours} hrs`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function slotLabel(slot: string): string {
  const labels: Record<string, string> = {
    'same-day': 'Same-day slot',
    'next-morning': 'Next morning',
    'express-60': '60-min express',
  };
  return labels[slot] ?? slot;
}
