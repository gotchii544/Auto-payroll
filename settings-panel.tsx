"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PayrollSettings } from "@/types";

interface SettingsPanelProps {
  workers: string[];
  settings: PayrollSettings;
  onChange: (s: PayrollSettings) => void;
}

export function SettingsPanel({ workers, settings, onChange }: SettingsPanelProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {workers.map((w) => (
          <div key={w} className="space-y-1.5">
            <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">
              {w.toUpperCase()} — RATE / HOUR (₱)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={settings.rates[w] ?? 0}
              onChange={(e) =>
                onChange({
                  ...settings,
                  rates: { ...settings.rates, [w]: Number(e.target.value) || 0 },
                })
              }
              className="border-zinc-700 bg-zinc-900 font-mono text-sm"
            />
          </div>
        ))}
      </div>

      <Separator className="bg-zinc-800" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">
            OVERTIME MULTIPLIER
          </Label>
          <Input
            type="number"
            min={1}
            step="0.05"
            value={settings.otMultiplier}
            onChange={(e) =>
              onChange({ ...settings, otMultiplier: Number(e.target.value) || 1 })
            }
            className="border-zinc-700 bg-zinc-900 font-mono text-sm"
          />
          <p className="font-mono text-[10px] text-zinc-600">
            e.g. 1.25 = 125% of hourly rate for hours past 4:00 PM
          </p>
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-zinc-300">
              DEDUCT 1-HR LUNCH
            </p>
            <p className="font-mono text-[10px] text-zinc-600">
              Unpaid break subtracted from regular hours (5+ hr days)
            </p>
          </div>
          <Switch
            checked={settings.deductLunch}
            onCheckedChange={(v) => onChange({ ...settings, deductLunch: v })}
          />
        </div>
      </div>
    </div>
  );
}
