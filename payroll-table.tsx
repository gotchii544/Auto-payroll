"use client";

import { Download } from "lucide-react";
import {
  DAY_LABELS,
  Deductions,
  EMPTY_DEDUCTIONS,
  PayrollRow,
  finalPay,
  fmtHr,
  fmtMoney,
  otRatePerHr,
  payrollToCSV,
  ratePerHr,
} from "@/lib/payroll";

interface PayrollTableProps {
  rows: PayrollRow[];
  wkStart: string;
  weeks: string[];
  onWeekChange: (wk: string) => void;
  deductions: Record<string, Deductions>;
  onDeductionChange: (key: string, patch: Partial<Deductions>) => void;
}

const DEDUCTION_FIELDS: { key: keyof Deductions; label: string }[] = [
  { key: "wednesdayCA", label: "WEDNESDAY CA" },
  { key: "sss", label: "SSS" },
  { key: "ph", label: "PH" },
  { key: "pi", label: "PI" },
  { key: "otherCA", label: "OTHER CA" },
  { key: "remainingCA", label: "REMAINING CA" },
];

export function PayrollTable({
  rows,
  wkStart,
  weeks,
  onWeekChange,
  deductions,
  onDeductionChange,
}: PayrollTableProps) {
  const fmtWeekLabel = (wk: string) => {
    const d = new Date(wk + "T00:00:00");
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const f = (x: Date) => x.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${f(d)} – ${f(end)}, ${end.getFullYear()}`;
  };

  const exportCSV = () => {
    const csv = payrollToCSV(rows, deductions, wkStart);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-week-${wkStart}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const monthLabel = new Date(wkStart + "T00:00:00")
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.2em] text-[#8fa08f]">Week</label>
          <select
            value={wkStart}
            onChange={(e) => onWeekChange(e.target.value)}
            className="rounded-lg border border-[#2e3d31] bg-[#121a14] px-3 py-2 text-sm [font-family:var(--font-plex)]"
          >
            {weeks.map((wk) => (
              <option key={wk} value={wk}>
                {fmtWeekLabel(wk)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ffd23f] px-4 py-2 text-sm font-bold text-[#1a1a05] transition hover:bg-[#ffdd6b]"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2e3d31]">
        <table className="w-full min-w-[1400px] border-collapse text-xs [font-family:var(--font-plex)]">
          <thead>
            <tr className="bg-[#1a2a1e] text-[10px] uppercase tracking-wider text-[#b8d4bc]">
              <th rowSpan={2} className="sticky left-0 z-10 border border-[#2e3d31] bg-[#1a2a1e] px-3 py-2 text-left">
                NAME
              </th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">RATE</th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">RATE<br />PER HR</th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">OT RATE<br />PER HR</th>
              <th colSpan={14} className="border border-[#2e3d31] bg-[#243524] px-2 py-1.5 text-[#ffd23f]">
                {monthLabel}
              </th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">TOTAL<br />RH</th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">TOTAL<br />OT</th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2">TOTAL<br />RH PAY</th>
              <th rowSpan={2} className="border border-[#2e3d31] px-2 py-2 text-red-400">TOTAL<br />OT PAY</th>
              <th rowSpan={2} className="border border-[#2e3d31] bg-[#3d3410] px-2 py-2 text-[#ffd23f]">TOTAL<br />PAY</th>
              {DEDUCTION_FIELDS.map((f) => (
                <th key={f.key} rowSpan={2} className="border border-[#2e3d31] px-2 py-2">
                  {f.label.split(" ").map((w, i) => (
                    <span key={i}>
                      {w}
                      <br />
                    </span>
                  ))}
                </th>
              ))}
              <th rowSpan={2} className="border border-[#2e3d31] bg-[#3d3410] px-2 py-2 text-[#ffd23f]">FINAL<br />PAY</th>
            </tr>
            <tr className="bg-[#16211a] text-[10px] text-[#8fa08f]">
              {DAY_LABELS.map((d, i) => (
                <th key={d} colSpan={2} className="border border-[#2e3d31] px-1 py-1">
                  {d}
                  <div className="mt-0.5 flex justify-around text-[9px]">
                    <span className="text-[#b8d4bc]">RH</span>
                    <span className="text-red-400">OT</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = `${r.worker.id}|${wkStart}`;
              const d = deductions[key] ?? EMPTY_DEDUCTIONS;
              return (
                <tr key={r.worker.id} className="bg-[#0f1611] text-center hover:bg-[#121a14]">
                  <td className="sticky left-0 z-10 border border-[#2e3d31] bg-[#0f1611] px-3 py-2 text-left font-bold uppercase">
                    {r.worker.name}
                  </td>
                  <td className="border border-[#2e3d31] px-2 py-2">{fmtMoney(r.worker.dailyRate)}</td>
                  <td className="border border-[#2e3d31] px-2 py-2">{fmtMoney(ratePerHr(r.worker))}</td>
                  <td className="border border-[#2e3d31] px-2 py-2">{fmtMoney(otRatePerHr(r.worker))}</td>
                  {r.days.map((c) => (
                    <>
                      <td
                        key={c.date + "rh"}
                        className={`border border-[#2e3d31] px-1.5 py-2 ${c.hasEntry ? "text-[#e8ede6]" : "text-[#4a5a4c]"}`}
                      >
                        {fmtHr(c.rh)}
                      </td>
                      <td
                        key={c.date + "ot"}
                        className={`border border-[#2e3d31] px-1.5 py-2 font-semibold ${c.ot > 0 ? "text-red-400" : "text-[#4a5a4c]"}`}
                      >
                        {fmtHr(c.ot)}
                      </td>
                    </>
                  ))}
                  <td className="border border-[#2e3d31] px-2 py-2 font-semibold">{fmtHr(r.totalRH)}</td>
                  <td className="border border-[#2e3d31] px-2 py-2 font-semibold">{fmtHr(r.totalOT)}</td>
                  <td className="border border-[#2e3d31] px-2 py-2">{fmtMoney(r.rhPay)}</td>
                  <td className="border border-[#2e3d31] px-2 py-2 text-red-400">{fmtMoney(r.otPay)}</td>
                  <td className="border border-[#2e3d31] bg-[#3d3410]/60 px-2 py-2 font-bold text-[#ffd23f]">
                    {fmtMoney(r.totalPay)}
                  </td>
                  {DEDUCTION_FIELDS.map((f) => (
                    <td key={f.key} className="border border-[#2e3d31] px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={d[f.key] === 0 ? "" : d[f.key]}
                        placeholder="0.00"
                        onChange={(e) =>
                          onDeductionChange(key, { [f.key]: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 rounded border border-[#2e3d31] bg-[#0d120e] px-1.5 py-1 text-right text-xs [font-family:var(--font-plex)] placeholder:text-[#4a5a4c]"
                      />
                    </td>
                  ))}
                  <td className="border border-[#2e3d31] bg-[#3d3410] px-2 py-2 text-sm font-bold text-[#ffd23f]">
                    {fmtMoney(finalPay(r, d))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#8fa08f]">
        FINAL PAY = TOTAL PAY − Wednesday CA − SSS − PH − PI − Other CA. Remaining CA is tracked
        for reference only. OT rate = hourly rate × 1.3.
      </p>
    </div>
  );
}
