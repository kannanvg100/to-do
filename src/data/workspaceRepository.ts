export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

const WORKSPACES_KEY = "hero-todos:workspaces";
const ACTIVE_KEY = "hero-todos:activeWorkspace";

function newId(): string {
  return crypto.randomUUID();
}

export function readWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Workspace[]) : [];
  } catch {
    return [];
  }
}

function writeWorkspaces(ws: Workspace[]): void {
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(ws));
}

export function readActiveWorkspaceId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function writeActiveWorkspaceId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function createWorkspace(name: string): Workspace {
  const ws = readWorkspaces();
  const next: Workspace = { id: newId(), name: name.trim(), createdAt: new Date().toISOString() };
  writeWorkspaces([...ws, next]);
  return next;
}

export function renameWorkspace(id: string, name: string): void {
  const ws = readWorkspaces().map((w) => (w.id === id ? { ...w, name: name.trim() } : w));
  writeWorkspaces(ws);
}

export function deleteWorkspace(id: string): void {
  writeWorkspaces(readWorkspaces().filter((w) => w.id !== id));
  // Also clean up tasks and order for this workspace
  localStorage.removeItem(`hero-todos:tasks:${id}`);
  localStorage.removeItem(`hero-todos:order:${id}`);
}

/** Migrate old un-scoped keys and remove corrupted order entries */
function runMigrations(defaultWorkspaceId: string): void {
  // Migrate old order key -> workspace-scoped
  const oldOrder = localStorage.getItem("hero-todos:order");
  if (oldOrder !== null) {
    const scopedKey = `hero-todos:order:${defaultWorkspaceId}`;
    if (!localStorage.getItem(scopedKey)) {
      localStorage.setItem(scopedKey, oldOrder);
    }
    localStorage.removeItem("hero-todos:order");
  }

  // Remove any corrupted keys (where value is the string "undefined", or key contains a comma)
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("hero-todos:order:") && key.includes(",")) {
      toRemove.push(key);
      continue;
    }
    const val = localStorage.getItem(key);
    if (val === "undefined" || val === "null") toRemove.push(key);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** Get or create the default workspace, return its id */
export function ensureDefaultWorkspace(): string {
  let ws = readWorkspaces();
  if (ws.length === 0) {
    const def = createWorkspace("My Tasks");
    writeActiveWorkspaceId(def.id);
    runMigrations(def.id);
    return def.id;
  }
  const activeId = readActiveWorkspaceId();
  const resolved = (activeId && ws.find((w) => w.id === activeId)) ? activeId : ws[0]!.id;
  writeActiveWorkspaceId(resolved);
  runMigrations(resolved);
  return resolved;
}
