import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PORT = 4317;
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_USAGE_PATH = join(ROOT_DIR, "docs", "ai", "api-usage.jsonl");
const TASKS_DIR = join(ROOT_DIR, "docs", "ai", "tasks");
const DOCS_AI_DIR = join(ROOT_DIR, "docs", "ai");
const ACTIVE_PROCESS_PATH = join(ROOT_DIR, "docs", "ai", "active-process.json");
const ACTIVE_WORKERS_PATH = join(ROOT_DIR, "docs", "ai", "active-workers.json");
const DOCS_PREVIEW_CHARS = 500;

type ActiveProcess = {
  actor: string;
  label: string;
  since: string | null;
};

const IDLE_PROCESS: ActiveProcess = { actor: "idle", label: "beklemede", since: null };

type Session = {
  id: string;
  title: string;
  workspace: string;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...CORS,
  });
  res.end(json);
}

function parseWorkspace(title: string): string {
  let t = title.trim().replace(/^●\s*/, "");
  t = t.replace(/\s+\[[^\]]+\]\s*$/g, "");
  t = t.replace(/\s*[-–—]\s*Visual Studio Code\s*$/i, "");
  const parts = t
    .split(/\s+[-–—]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "vscode";
  return parts[parts.length - 1] ?? "vscode";
}

function powershellArgs(script: string): string[] {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded];
}

type ProcessRow = { id?: unknown; title?: unknown };

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

async function listCodeSessions(): Promise<Session[]> {
  if (process.platform !== "win32") return [];

  const script = [
    "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false",
    "$procs = @(Get-Process -Name Code -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | ForEach-Object { [pscustomobject]@{ id = $_.Id.ToString(); title = $_.MainWindowTitle } })",
    "ConvertTo-Json -InputObject $procs -Compress",
  ].join("; ");

  try {
    const { stdout } = await execFileAsync("powershell.exe", powershellArgs(script), {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
    });

    const raw = stdout.replace(/^\uFEFF/, "").trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ProcessRow | ProcessRow[];
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    const seen = new Set<string>();
    const sessions: Session[] = [];
    for (const row of rows) {
      const id = asText(row.id);
      const title = asText(row.title);
      if (!id || !title) continue;
      const key = `${id}\0${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sessions.push({ id, title, workspace: parseWorkspace(title) });
    }
    return sessions;
  } catch {
    return [];
  }
}

type AgentStatus = {
  active: boolean;
  pids: string[];
};

async function listAgentStatus(): Promise<AgentStatus> {
  if (process.platform !== "win32") return { active: false, pids: [] };

  const script = [
    "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false",
    "$procs = @(Get-Process -Name agent -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ id = $_.Id.ToString() } })",
    "ConvertTo-Json -InputObject $procs -Compress",
  ].join("; ");

  try {
    const { stdout } = await execFileAsync("powershell.exe", powershellArgs(script), {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
    });

    const raw = stdout.replace(/^\uFEFF/, "").trim();
    if (!raw) return { active: false, pids: [] };

    const parsed = JSON.parse(raw) as ProcessRow | ProcessRow[];
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const seen = new Set<string>();
    const pids: string[] = [];
    for (const row of rows) {
      const id = asText(row.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      pids.push(id);
    }
    return { active: pids.length > 0, pids };
  } catch {
    return { active: false, pids: [] };
  }
}

type SystemStats = {
  cpuPercent: number;
  memUsedMb: number;
  memTotalMb: number;
};

type StatsRow = { cpuPercent?: unknown; memUsedMb?: unknown; memTotalMb?: unknown };

function asFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

async function getSystemStats(): Promise<SystemStats> {
  if (process.platform !== "win32") {
    return { cpuPercent: 0, memUsedMb: 0, memTotalMb: 0 };
  }

  const script = [
    "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false",
    "$cpuVals = @(Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | ForEach-Object { $_.LoadPercentage })",
    "$cpuAvg = 0",
    "if ($cpuVals.Count -gt 0) { $cpuAvg = ($cpuVals | Measure-Object -Average).Average }",
    "$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue",
    "$totalKb = 0",
    "$freeKb = 0",
    "if ($os) { $totalKb = [double]$os.TotalVisibleMemorySize; $freeKb = [double]$os.FreePhysicalMemory }",
    "$obj = [pscustomobject]@{ cpuPercent = [math]::Round($cpuAvg, 1); memUsedMb = [math]::Round(($totalKb - $freeKb) / 1024); memTotalMb = [math]::Round($totalKb / 1024) }",
    "ConvertTo-Json -InputObject $obj -Compress",
  ].join("; ");

  try {
    const { stdout } = await execFileAsync("powershell.exe", powershellArgs(script), {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
    });

    const raw = stdout.replace(/^\uFEFF/, "").trim();
    if (!raw) return { cpuPercent: 0, memUsedMb: 0, memTotalMb: 0 };

    const parsed = JSON.parse(raw) as StatsRow;
    return {
      cpuPercent: asFiniteNumber(parsed.cpuPercent),
      memUsedMb: asFiniteNumber(parsed.memUsedMb),
      memTotalMb: asFiniteNumber(parsed.memTotalMb),
    };
  } catch {
    return { cpuPercent: 0, memUsedMb: 0, memTotalMb: 0 };
  }
}

type ApiUsageEntry = {
  task: string;
  timestamp: string;
  tokens: number;
  cost_usd: number;
  model: string;
};

function parseRequiredNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseApiUsageEntry(value: unknown): ApiUsageEntry | null {
  if (value === null || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const task = asText(row.task);
  const timestamp = asText(row.timestamp);
  const model = asText(row.model);
  const tokens = parseRequiredNumber(row.tokens);
  const costUsd = parseRequiredNumber(row.cost_usd);
  if (!task || !timestamp || !model || tokens === null || costUsd === null) {
    return null;
  }
  return { task, timestamp, tokens, cost_usd: costUsd, model };
}

async function readApiUsage(): Promise<{
  entries: ApiUsageEntry[];
  totalTokens: number;
  totalCostUsd: number;
}> {
  let raw = "";
  try {
    raw = await readFile(API_USAGE_PATH, "utf8");
  } catch {
    return { entries: [], totalTokens: 0, totalCostUsd: 0 };
  }

  const entries: ApiUsageEntry[] = [];
  let totalTokens = 0;
  let totalCostUsd = 0;
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      continue;
    }
    const entry = parseApiUsageEntry(parsed);
    if (!entry) continue;
    entries.push(entry);
    totalTokens += entry.tokens;
    totalCostUsd += entry.cost_usd;
  }
  return { entries, totalTokens, totalCostUsd };
}

type TaskStatus = "open" | "doing" | "review" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  worker: string;
  mtimeIso: string;
};

const TASK_STATUSES = new Set<string>(["open", "doing", "review", "done"]);

function parseTaskHeading(line: string): { id: string; title: string } | null {
  const match = line.trim().match(/^#\s+(T-\d+)\s+(.*)$/i);
  if (!match) return null;
  const id = (match[1] ?? "").toUpperCase();
  const title = (match[2] ?? "").trim();
  if (!id) return null;
  return { id, title: title || id };
}

function parseTaskField(lines: string[], name: string): string {
  const prefix = `${name}:`;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return "";
}

function parseTaskStatus(raw: string): TaskStatus {
  const token = raw.split(/[|,]/)[0]?.trim().toLowerCase() ?? "";
  if (TASK_STATUSES.has(token)) return token as TaskStatus;
  return "open";
}

async function listTasks(): Promise<Task[]> {
  let names: string[] = [];
  try {
    names = await readdir(TASKS_DIR);
  } catch {
    return [];
  }

  type TaskRow = Task & { mtimeMs: number };
  const rows: TaskRow[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".md")) continue;
    if (name.toLowerCase() === "_template.md") continue;

    const filePath = join(TASKS_DIR, name);
    let raw = "";
    let mtimeMs = 0;
    let mtimeIso = "";
    try {
      const [content, fileStat] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
      raw = content;
      mtimeMs = fileStat.mtimeMs;
      mtimeIso = fileStat.mtime.toISOString();
    } catch {
      continue;
    }

    const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
    const heading = parseTaskHeading(lines[0] ?? "");
    const id = heading?.id ?? name.replace(/\.md$/i, "");
    const title = heading?.title ?? id;
    const status = parseTaskStatus(parseTaskField(lines, "Status"));
    const worker = parseTaskField(lines, "Worker") || "unknown";
    rows.push({ id, title, status, worker, mtimeIso, mtimeMs });
  }

  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows.map(({ id, title, status, worker, mtimeIso }) => ({
    id,
    title,
    status,
    worker,
    mtimeIso,
  }));
}

type DocsFeedItem = {
  path: string;
  mtimeIso: string;
  title: string;
  preview: string;
};

async function collectMarkdownFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
}

function firstHeading(content: string): string {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(/^#+\s+(.+)$/);
    if (match) {
      const title = (match[1] ?? "").trim();
      if (title) return title;
    }
  }
  return "";
}

function clipPreview(content: string, max: number): string {
  const text = content.replace(/^\uFEFF/, "");
  if (text.length <= max) return text;
  return text.slice(0, max);
}

async function listDocsFeed(): Promise<DocsFeedItem[]> {
  const files: string[] = [];
  await collectMarkdownFiles(DOCS_AI_DIR, files);

  type Row = DocsFeedItem & { mtimeMs: number };
  const rows: Row[] = [];
  for (const filePath of files) {
    try {
      const [content, fileStat] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
      const rel = relative(ROOT_DIR, filePath).split("\\").join("/");
      const fallback = rel.replace(/^.*\//, "").replace(/\.md$/i, "");
      rows.push({
        path: rel,
        mtimeIso: fileStat.mtime.toISOString(),
        title: firstHeading(content) || fallback,
        preview: clipPreview(content, DOCS_PREVIEW_CHARS),
        mtimeMs: fileStat.mtimeMs,
      });
    } catch {
      continue;
    }
  }

  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows.map(({ path, mtimeIso, title, preview }) => ({ path, mtimeIso, title, preview }));
}

function parseActiveProcess(value: unknown): ActiveProcess {
  if (value === null || typeof value !== "object") return IDLE_PROCESS;
  const row = value as Record<string, unknown>;
  const actor = asText(row.actor) || "idle";
  const label = asText(row.label) || (actor === "idle" ? "beklemede" : "");
  let since: string | null = null;
  if (typeof row.since === "string" && row.since.trim().length > 0) {
    since = row.since.trim();
  }
  return { actor, label, since };
}

async function readActiveProcess(): Promise<ActiveProcess> {
  try {
    const raw = await readFile(ACTIVE_PROCESS_PATH, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, "").trim()) as unknown;
    return parseActiveProcess(parsed);
  } catch {
    return IDLE_PROCESS;
  }
}

type WorkerStatus = "idle" | "busy";

type ActiveWorker = {
  id: string;
  label: string;
  status: WorkerStatus;
  task: string | null;
  detail: string | null;
  since: string | null;
};

const IDLE_WORKERS: ActiveWorker[] = [
  { id: "agent-primary", label: "assistant", status: "idle", task: null, detail: null, since: null },
  { id: "api-worker", label: "api service", status: "idle", task: null, detail: null, since: null },
  { id: "local-llm", label: "qwen2.5-coder", status: "idle", task: null, detail: null, since: null },
];

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

function parseWorkerStatus(value: unknown): WorkerStatus {
  return asText(value).toLowerCase() === "busy" ? "busy" : "idle";
}

function parseActiveWorker(value: unknown, fallback: ActiveWorker): ActiveWorker {
  if (value === null || typeof value !== "object") return fallback;
  const row = value as Record<string, unknown>;
  return {
    id: fallback.id,
    label: asText(row.label) || fallback.label,
    status: parseWorkerStatus(row.status),
    task: asNullableText(row.task),
    detail: asNullableText(row.detail),
    since: asNullableText(row.since),
  };
}

function parseActiveWorkers(value: unknown): ActiveWorker[] {
  if (value === null || typeof value !== "object") return IDLE_WORKERS.map((w) => ({ ...w }));
  const row = value as Record<string, unknown>;
  const list = Array.isArray(row.workers) ? row.workers : [];
  const byId = new Map<string, unknown>();
  for (const entry of list) {
    if (entry === null || typeof entry !== "object") continue;
    const id = asText((entry as Record<string, unknown>).id);
    if (id) byId.set(id, entry);
  }
  return IDLE_WORKERS.map((fallback) => parseActiveWorker(byId.get(fallback.id), fallback));
}

async function readActiveWorkers(): Promise<ActiveWorker[]> {
  try {
    const raw = await readFile(ACTIVE_WORKERS_PATH, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, "").trim()) as unknown;
    return parseActiveWorkers(parsed);
  } catch {
    return IDLE_WORKERS.map((w) => ({ ...w }));
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/sessions") {
    const sessions = await listCodeSessions();
    send(res, 200, { sessions });
    return;
  }

  if (req.method === "GET" && url.pathname === "/agent-status") {
    const status = await listAgentStatus();
    send(res, 200, status);
    return;
  }

  if (req.method === "GET" && url.pathname === "/system-stats") {
    const stats = await getSystemStats();
    send(res, 200, stats);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api-usage") {
    const usage = await readApiUsage();
    send(res, 200, usage);
    return;
  }

  if (req.method === "GET" && url.pathname === "/tasks") {
    const tasks = await listTasks();
    send(res, 200, { tasks });
    return;
  }

  if (req.method === "GET" && url.pathname === "/docs-feed") {
    const docs = await listDocsFeed();
    send(res, 200, { docs });
    return;
  }

  if (req.method === "GET" && url.pathname === "/active-process") {
    const active = await readActiveProcess();
    send(res, 200, active);
    return;
  }

  if (req.method === "GET" && url.pathname === "/active-workers") {
    const workers = await readActiveWorkers();
    send(res, 200, { workers });
    return;
  }

  send(res, 404, { error: "not found" });
}

const server = createServer((req, res) => {
  void handle(req, res).catch(() => {
    if (!res.headersSent) {
      send(res, 500, { error: "internal" });
    } else {
      res.end();
    }
  });
});

server.listen(PORT, () => {
  process.stdout.write(`workspace server listening on http://127.0.0.1:${PORT}\n`);
});
