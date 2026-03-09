// ─── Domain Colors — Meat / Kosher ───────────────────────────────────────────
// These are fixed brand colors for the two kosher categories.
// Red and green are RESERVED for חלק/מוכשר — do not reuse for status indicators.

export const HALAK    = '#cc2200';  // חלק     — dark red
export const MUCHSHAR = '#15803d';  // מוכשר   — forest green
export const TREIF    = '#64748b';  // טרף      — slate gray
export const TOTAL    = '#1e293b';  // סה"כ     — near black

// Light background tints for tables/cards (7-8% opacity)
export const HALAK_BG    = 'rgba(204, 34,  0, 0.07)';
export const MUCHSHAR_BG = 'rgba( 21,128, 61, 0.08)';
export const TREIF_BG    = '#f1f5f9';

// ─── System / UI Status Colors ────────────────────────────────────────────────
// These intentionally avoid red and green (reserved for kosher domain above).

export const SUCCESS = '#0d9488';  // הצלחה    — teal
export const ERROR   = '#ea580c';  // שגיאה    — orange
export const WARNING = '#d97706';  // אזהרה    — amber
export const ANOMALY = '#7c3aed';  // חריגות   — violet
export const INFO    = '#2563eb';  // מידע      — blue
export const NEUTRAL = '#64748b';  // ניטרלי   — slate

// Light background tints for status badges
export const SUCCESS_BG = 'rgba( 13,148,136, 0.08)';
export const ERROR_BG   = 'rgba(234, 88,  12, 0.08)';
export const WARNING_BG = 'rgba(217,119,  6, 0.08)';
export const ANOMALY_BG = 'rgba(124, 58,237, 0.08)';
export const INFO_BG    = 'rgba( 37, 99,235, 0.08)';
