// Reusable types สำหรับ self-perf plugin (ไม่ใช้ any/unknown, ไม่ inline)
export type Writer = (line: string) => void;

export interface PluginCtx {
  args?: string[];
  writer?: Writer;
}

export interface PluginResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export interface Day {
  commits: number;
  files: number;
  add: number;
  del: number;
}

export interface DayRow extends Day {
  date: string;
  score: number;
}

export interface PerfReport {
  repo: string;
  author: string;
  baseline: number;
  baselineDays: string[];
  rows: DayRow[];
}
