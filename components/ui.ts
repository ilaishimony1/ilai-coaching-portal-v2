// Small display helpers shared by the screens. They only change how text is
// shown; the saved data is never touched.

const ACRONYMS = new Set(['HS', 'APT', 'PPT', 'PDF', 'A', 'B', 'C', 'D', 'E', 'F']);

/** "STRADDLE TO DIAMOND" -> "Straddle to diamond". Text that already has
 *  lower-case letters is left exactly as typed. */
export const niceCase = (text?: string): string => {
  if (!text) return '';
  if (/[a-z]/.test(text) || !/[A-Z]/.test(text)) return text;
  const words = text.toLowerCase().split(/(\s+)/);
  let first = true;
  return words
    .map(w => {
      if (!w.trim()) return w;
      if (ACRONYMS.has(w.toUpperCase()) && w.length > 1) { first = false; return w.toUpperCase(); }
      if (first) { first = false; return w.charAt(0).toUpperCase() + w.slice(1); }
      return w;
    })
    .join('');
};

export const hasHebrew = (text?: string) => !!text && /[֐-׿]/.test(text);

/** Props for a block of free text that may be Hebrew. */
export const textDir = (text?: string) =>
  hasHebrew(text) ? ({ dir: 'rtl', lang: 'he' } as const) : ({ dir: 'auto' } as const);

/** "3 × 10 sec · rest 2 min". Empty when nothing was prescribed (a warm-up row). */
export const exerciseMeta = (ex: { sets?: string; reps?: string; duration?: string; restTime?: string }) => {
  const sets = (ex.sets || '').trim();
  const target = (ex.reps || ex.duration || '').trim();
  const empty = (v: string) => !v || v === '0';
  if (empty(sets) && empty(target)) return '';
  const main = [sets, target].filter(v => !empty(v)).join(' × ');
  // Same default rest the workout page has always shown.
  return `${main} · rest ${(ex.restTime || '').trim() || '90s'}`;
};
