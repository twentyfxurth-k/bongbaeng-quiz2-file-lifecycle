// Reusable types สำหรับ file-lifecycle plugin (ไม่ใช้ any/unknown, ไม่ inline)
export type Writer = (line: string) => void;

// shape ของ context ที่ maw engine ส่งเข้า invoke (subset ที่ plugin ใช้)
export interface PluginCtx {
  args?: string[];
  writer?: Writer;
}

export interface PluginResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export interface Life {
  born: Record<string, string>;
  died: Record<string, string>;
  mods: Record<string, number>;
}

export interface Tombstone {
  file: string;
  born: string;
  died: string;
}

export interface Churned {
  file: string;
  edits: number;
}

export interface NamedDate {
  file: string;
  date: string;
}

export interface LifecycleReport {
  repo: string;
  since: string;
  created: number;
  deleted: number;
  alive: number;
  death_rate: number;
  timeline_tombstones: Tombstone[];
  most_churned: Churned[];
  newest_alive: NamedDate[];
}
