export interface ParsedStamp {
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm 24h
  raw: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number | string) => String(n).padStart(2, "0");

export function parseTimestamp(text: string): ParsedStamp {
  const raw = text.replace(/\s+/g, " ").trim();
  let date: string | null = null;
  let time: string | null = null;

  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = raw.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const mo = +m[2], da = +m[3];
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) date = `${m[1]}-${pad(mo)}-${pad(da)}`;
  }

  // MM/DD/YYYY or DD/MM/YYYY
  if (!date) {
    m = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})/);
    if (m) {
      let mo = +m[1], da = +m[2];
      if (mo > 12 && da <= 12) [mo, da] = [da, mo];
      if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) date = `${m[3]}-${pad(mo)}-${pad(da)}`;
    }
  }

  // "Aug 22, 2026" / "22 Aug 2026"
  if (!date) {
    m = raw.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/i);
    if (m) date = `${m[3]}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(m[2])}`;
  }
  if (!date) {
    m = raw.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d{2})/i);
    if (m) date = `${m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(m[1])}`;
  }

  // Time: 7:01 AM / 07:01 / 16:05:33
  m = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm|A\.M\.|P\.M\.)?/);
  if (m) {
    let h = +m[1];
    const ap = m[3]?.toUpperCase().replace(/\./g, "");
    if (h <= 23) {
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      time = `${pad(h)}:${m[2]}`;
    }
  }

  return { date, time, raw };
}

// Tesseract worker (cached across calls, loaded from CDN to avoid bundling issues)
let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng");
    })();
  }
  return workerPromise;
}

export async function ocrImage(file: File | string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(file);
  return data.text as string;
}
