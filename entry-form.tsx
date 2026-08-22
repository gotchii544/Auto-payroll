"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ocrTimemark } from "@/lib/ocr";
import { TimeEntry } from "@/types";

interface EntryFormProps {
  workers: string[];
  onAdd: (entry: TimeEntry) => void;
}

type SlotState = "idle" | "scanning" | "done" | "failed";

interface Slot {
  state: SlotState;
  progress: number;
  fileName?: string;
  note?: string;
}

const emptySlot: Slot = { state: "idle", progress: 0 };

export function EntryForm({ workers, onAdd }: EntryFormProps) {
  const [worker, setWorker] = useState(workers[0] ?? "");
  const [date, setDate] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [slotIn, setSlotIn] = useState<Slot>(emptySlot);
  const [slotOut, setSlotOut] = useState<Slot>(emptySlot);
  const [error, setError] = useState("");
  const inRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);

  const usedOcr = slotIn.state === "done" || slotOut.state === "done";

  async function handleFile(kind: "in" | "out", file: File | undefined) {
    if (!file) return;
    const setSlot = kind === "in" ? setSlotIn : setSlotOut;
    setSlot({ state: "scanning", progress: 0, fileName: file.name });
    try {
      const parsed = await ocrTimemark(file, (pct) =>
        setSlot({ state: "scanning", progress: pct, fileName: file.name })
      );
      if (parsed.date) setDate(parsed.date);
      if (parsed.time) {
        if (kind === "in") setTimeIn(parsed.time);
        else setTimeOut(parsed.time);
      }
      if (!parsed.date && !parsed.time) {
        setSlot({
          state: "failed",
          progress: 100,
          fileName: file.name,
          note: "No timestamp found — enter manually below",
        });
      } else {
        setSlot({
          state: "done",
          progress: 100,
          fileName: file.name,
          note: [parsed.date, parsed.time].filter(Boolean).join(" · "),
        });
      }
    } catch {
      setSlot({
        state: "failed",
        progress: 0,
        fileName: file.name,
        note: "Scan failed — enter manually below",
      });
    }
  }

  function handleSave() {
    setError("");
    if (!worker) return setError("Select a worker.");
    if (!date) return setError("Date is required.");
    if (!timeIn || !timeOut) return setError("Time in and time out are required.");
    onAdd({
      id: crypto.randomUUID(),
      worker,
      date,
      timeIn,
      timeOut,
      source: usedOcr ? "timemark" : "manual",
    });
    setDate("");
    setTimeIn("");
    setTimeOut("");
    setSlotIn(emptySlot);
    setSlotOut(emptySlot);
    if (inRef.current) inRef.current.value = "";
    if (outRef.current) outRef.current.value = "";
  }

  function renderSlot(kind: "in" | "out", slot: Slot, ref: React.RefObject<HTMLInputElement | null>) {
    const label = kind === "in" ? "TIME-IN PHOTO" : "TIME-OUT PHOTO";
    return (
      <div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(kind, e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={slot.state === "scanning"}
          className={cn(
            "w-full rounded-md border-2 border-dashed px-4 py-5 text-left transition-colors",
            slot.state === "idle" && "border-zinc-700 hover:border-amber-500/70 hover:bg-zinc-900",
            slot.state === "scanning" && "border-amber-500/60 bg-zinc-900",
            slot.state === "done" && "border-emerald-600/60 bg-emerald-950/30",
            slot.state === "failed" && "border-red-600/60 bg-red-950/20"
          )}
        >
          <div className="flex items-center gap-3">
            {slot.state === "idle" && <Upload className="h-4 w-4 text-amber-400" />}
            {slot.state === "scanning" && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
            {slot.state === "done" && <Check className="h-4 w-4 text-emerald-400" />}
            {slot.state === "failed" && <AlertCircle className="h-4 w-4 text-red-400" />}
            <div className="min-w-0">
              <p className="font-display text-xs tracking-[0.2em] text-zinc-300">{label}</p>
              <p className="truncate font-mono text-[11px] text-zinc-500">
                {slot.state === "idle" && "Drop or click to scan timemark image"}
                {slot.state === "scanning" && `Reading stamp… ${slot.progress}%`}
                {(slot.state === "done" || slot.state === "failed") && (slot.note || slot.fileName)}
              </p>
            </div>
          </div>
          {slot.state === "scanning" && <Progress value={slot.progress} className="mt-3 h-1" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderSlot("in", slotIn, inRef)}
        {renderSlot("out", slotOut, outRef)}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">WORKER</Label>
          <Select value={worker} onValueChange={setWorker}>
            <SelectTrigger className="border-zinc-700 bg-zinc-900 font-mono text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">DATE</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border-zinc-700 bg-zinc-900 font-mono text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">TIME IN</Label>
          <Input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)}
            className="border-zinc-700 bg-zinc-900 font-mono text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-display text-[10px] tracking-[0.2em] text-zinc-400">TIME OUT</Label>
          <Input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)}
            className="border-zinc-700 bg-zinc-900 font-mono text-sm" />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 font-mono text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <Button
        onClick={handleSave}
        className="w-full bg-amber-500 font-display tracking-[0.25em] text-zinc-950 hover:bg-amber-400 sm:w-auto"
      >
        <Clock className="mr-2 h-4 w-4" /> PUNCH ENTRY
      </Button>
    </div>
  );
}
