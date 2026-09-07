/** Datas sem hora trafegam como 'YYYY-MM-DD'. Toda a aritmética acontece em UTC. */

export const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export const toIso = (date: Date): string => date.toISOString().slice(0, 10);

/** O "hoje" do usuário — às 23h em São Paulo ainda é hoje. */
export const isoToday = (timezone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());

export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** Clampa o dia ao tamanho do mês: dia 31 em fevereiro vira 28 (ou 29). */
export const dateAt = (year: number, month: number, day: number): string =>
  toIso(
    new Date(Date.UTC(year, month, Math.min(day, daysInMonth(year, month)))),
  );

export const addDays = (iso: string, days: number): string => {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
};

export const addMonths = (iso: string, months: number): string => {
  const date = parseIso(iso);
  return dateAt(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
  );
};

export const addYears = (iso: string, years: number): string =>
  addMonths(iso, years * 12);

/** '2026-03-14' → '2026-03' */
export const monthKey = (iso: string): string => iso.slice(0, 7);

/** '04/09 23:05' no fuso do usuário — o carimbo que vai no histórico do prompt. */
export const stamp = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace(',', '');
