export interface Worker {
  id: string;
  name: string;
  dailyRate: number;
}

export interface TimeEntry {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm (24h)
  timeOut: string; // HH:mm (24h)
}

export interface Deductions {
  wednesdayCA: number;
  sss: number;
  ph: number;
  pi: number;
  otherCA: number;
  remainingCA: number;
}

export const EMPTY_DEDUCTIONS: Deductions = {
  wednesdayCA: 0,
  sss: 0,
  ph: 0,
  pi: 0,
  otherCA: 0,
  remainingCA: 0,
};

export const DEFAULT_WORKERS: Worker[] = [
  { id: "joy", name: "JOY YAPTENGCO", dailyRate: 600 },
  { id: "jerico", name: "JERICO DUBA", dailyRate: 650 },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const roundHalf = (n: number) => Math.round(n * 2) / 2;

export const ratePerHr = (w: Worker) => round2(w.dailyRate / 8);
export const otRatePerHr = (w: Worker) => round2((w.dailyRate / 8) * 1.3);

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Schedule: 7:00 AM – 4:00 PM (1hr lunch = 8 paid regular hours). OT past 4:00 PM.
const WORK_START = 7 * 60;
const WORK_END = 16 * 60;
const LUNCH_START = 12 * 60;
const LUNCH_END = 13 * 60;

export function computeDay(timeIn: string, timeOut: string): { rh: number; ot: number } {
  if (!timeIn || !timeOut) return { rh: 0, ot: 0 };
  const tin = Math.max(toMin(timeIn), WORK_START);
  const tout = toMin(timeOut);
  const regEnd = Math.min(tout, WORK_END);
  let regMin = Math.max(0, regEnd - tin);
  if (tin < LUNCH_START && regEnd > LUNCH_END) regMin -= 60; // unpaid lunch
  const rh = Math.min(8, Math.max(0, roundHalf(regMin / 60)));
  const ot = roundHalf(Math.max(0, tout - WORK_END) / 60);
  return { rh, ot };
}

export function weekStart(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return toISO(d);
}

export function weekDates(startISO: string): string[] {
  const d = new Date(startISO + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return toISO(x);
  });
}

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const DAY_LABELS = ["SUN", "MON", "TUES", "WED", "THURS", "FRI", "SAT"];

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtHr = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export interface DayCell {
  date: string;
  rh: number;
  ot: number;
  hasEntry: boolean;
}

export interface PayrollRow {
  worker: Worker;
  days: DayCell[];
  totalRH: number;
  totalOT: number;
  rhPay: number;
  otPay: number;
  totalPay: number;
}

export function buildPayroll(
  workers: Worker[],
  entries: TimeEntry[],
  wkStart: string
): PayrollRow[] {
  const dates = weekDates(wkStart);
  return workers.map((worker) => {
    const days: DayCell[] = dates.map((date) => {
      const dayEntries = entries.filter((e) => e.workerId === worker.id && e.date === date);
      let rh = 0;
      let ot = 0;
      for (const e of dayEntries) {
        const c = computeDay(e.timeIn, e.timeOut);
        rh += c.rh;
        ot += c.ot;
      }
      return { date, rh: Math.min(8, rh), ot, hasEntry: dayEntries.length > 0 };
    });
    const totalRH = days.reduce((s, d) => s + d.rh, 0);
    const totalOT = days.reduce((s, d) => s + d.ot, 0);
    const rhPay = round2(totalRH * ratePerHr(worker));
    const otPay = round2(totalOT * otRatePerHr(worker));
    return { worker, days, totalRH, totalOT, rhPay, otPay, totalPay: round2(rhPay + otPay) };
  });
}

export function finalPay(row: PayrollRow, d: Deductions): number {
  return round2(row.totalPay - d.wednesdayCA - d.sss - d.ph - d.pi - d.otherCA);
}

export function payrollToCSV(
  rows: PayrollRow[],
  deductions: Record<string, Deductions>,
  wkStart: string
): string {
  const dates = weekDates(wkStart);
  const header = [
    "NAME",
    "RATE",
    "RATE/HR",
    "OT RATE/HR",
    ...dates.flatMap((dt, i) => [`${DAY_LABELS[i]} ${dt} RH`, `${DAY_LABELS[i]} ${dt} OT`]),
    "TOTAL RH",
    "TOTAL OT",
    "TOTAL RH PAY",
    "TOTAL OT PAY",
    "TOTAL PAY",
    "WEDNESDAY CA",
    "SSS",
    "PH",
    "PI",
    "OTHER CA",
    "REMAINING CA",
    "FINAL PAY",
  ];
  const lines = rows.map((r) => {
    const d = deductions[`${r.worker.id}|${wkStart}`] ?? EMPTY_DEDUCTIONS;
    return [
      r.worker.name,
      r.worker.dailyRate.toFixed(2),
      ratePerHr(r.worker).toFixed(2),
      otRatePerHr(r.worker).toFixed(2),
      ...r.days.flatMap((c) => [String(c.rh), String(c.ot)]),
      String(r.totalRH),
      String(r.totalOT),
      r.rhPay.toFixed(2),
      r.otPay.toFixed(2),
      r.totalPay.toFixed(2),
      d.wednesdayCA.toFixed(2),
      d.sss.toFixed(2),
      d.ph.toFixed(2),
      d.pi.toFixed(2),
      d.otherCA.toFixed(2),
      d.remainingCA.toFixed(2),
      finalPay(r, d).toFixed(2),
    ].join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
