import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/task";

export type TaskRepository = {
  list(): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function storageKey(workspaceId: string): string {
  return `hero-todos:tasks:${workspaceId}`;
}

/** Sync read for initial React state. */
export function readTasksFromLocalStorage(workspaceId: string): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    // Legacy migration: if no workspace-scoped key, check old key once
    const legacy = !raw ? localStorage.getItem("hero-todos:v1") : null;
    const source = raw ?? legacy;
    if (!source) return [];
    const parsed = JSON.parse(source) as unknown;
    if (!Array.isArray(parsed)) return [];
    // If migrating from legacy, write to new key and clear old one
    if (legacy && !raw) {
      localStorage.setItem(storageKey(workspaceId), source);
      localStorage.removeItem("hero-todos:v1");
    }
    return parsed as Task[];
  } catch {
    return [];
  }
}

function readAll(workspaceId: string): Task[] {
  return readTasksFromLocalStorage(workspaceId);
}

function writeAll(workspaceId: string, tasks: Task[]): void {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(tasks));
}

export function createLocalStorageTaskRepository(workspaceId: string): TaskRepository {
  return {
    async list() {
      return readAll(workspaceId);
    },

    async create(input: CreateTaskInput) {
      const tasks = readAll(workspaceId);
      const t = nowIso();
      const task: Task = {
        id: newId(),
        title: input.title.trim(),
        completed: false,
        dueDate: input.dueDate,
        recurrence: input.recurrence ?? null,
        createdAt: t,
        updatedAt: t,
      };
      tasks.push(task);
      writeAll(workspaceId, tasks);
      return task;
    },

    async update(id: string, patch: UpdateTaskInput) {
      const tasks = readAll(workspaceId);
      const i = tasks.findIndex((x) => x.id === id);
      if (i < 0) throw new Error(`Task not found: ${id}`);
      const prev = tasks[i]!;
      const next: Task = {
        ...prev,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : prev.title,
        updatedAt: nowIso(),
      };
      tasks[i] = next;
      writeAll(workspaceId, tasks);
      return next;
    },

    async delete(id: string) {
      const tasks = readAll(workspaceId).filter((x) => x.id !== id);
      writeAll(workspaceId, tasks);
    },
  };
}
