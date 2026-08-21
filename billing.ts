// Monthly-membership billing helpers.
// A monthly client has no end date — they renew on the same day every month,
// anchored to billingAnchorDate (the first / most recent payment date).

export interface BillingCycle {
  previous: Date;
  next: Date;
  daysUntil: number;
  progress: number; // 0-1 through the current billing cycle
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Same day-of-month, clamped to the length of that month (31st → 28th in Feb).
// Month values outside 0-11 roll into the neighbouring year, which is what we want.
const onDayOfMonth = (year: number, month: number, day: number) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
};

const buildCycle = (previous: Date, next: Date, now: Date): BillingCycle => {
  const span = next.getTime() - previous.getTime();
  const elapsed = now.getTime() - previous.getTime();
  return {
    previous,
    next,
    daysUntil: Math.round((next.getTime() - now.getTime()) / 86400000),
    progress: span > 0 ? Math.min(Math.max(elapsed / span, 0), 1) : 0,
  };
};

export const getBillingCycle = (anchorDate?: string, today: Date = new Date()): BillingCycle | null => {
  if (!anchorDate) return null;
  const anchor = new Date(`${anchorDate}T00:00:00`);
  if (isNaN(anchor.getTime())) return null;

  const now = startOfDay(today);
  const day = anchor.getDate();

  // First payment hasn't happened yet — that one is the next one.
  if (anchor > now) {
    return buildCycle(onDayOfMonth(anchor.getFullYear(), anchor.getMonth() - 1, day), anchor, now);
  }

  let next = onDayOfMonth(now.getFullYear(), now.getMonth(), day);
  if (next < now) next = onDayOfMonth(now.getFullYear(), now.getMonth() + 1, day);
  const previous = onDayOfMonth(next.getFullYear(), next.getMonth() - 1, day);
  return buildCycle(previous, next, now);
};

export const formatBillingDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// Full months the client has been a member — the "how long have they been with me" number.
export const getMonthsActive = (startDate?: string, today: Date = new Date()): number | null => {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (isNaN(start.getTime())) return null;
  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
};
