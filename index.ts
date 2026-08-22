export interface TimeEntry {
  id: string;
  worker: string;
  date: string; // yyyy-MM-dd
  timeIn: string; // HH:mm (24h)
  timeOut: string; // HH:mm (24h)
  source: "timemark" | "manual";
}

export interface PayrollSettings {
  rates: Record<string, number>; // hourly rate per worker (PHP)
  otMultiplier: number; // e.g. 1.25
  deductLunch: boolean; // deduct 1h unpaid lunch when regular span >= 5h
}

export interface ComputedEntry extends TimeEntry {
  isRestDay: boolean; // Sat/Sun — all hours counted as overtime
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
}
