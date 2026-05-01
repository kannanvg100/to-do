import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TaskRepository } from "../../data/taskRepository";
import { readTasksFromLocalStorage } from "../../data/taskRepository";
import type { CreateTaskInput, UpdateTaskInput } from "../../types/task";
import { TasksContext } from "./tasksContext";

export function TaskProvider({
  repo,
  workspaceId,
  children,
}: {
  repo: TaskRepository;
  workspaceId: string;
  children: ReactNode;
}) {
  const [tasks, setTasks] = useState(() => {
    // Try localStorage for instant initial render; Supabase refresh follows immediately
    try { return readTasksFromLocalStorage(workspaceId); } catch { return []; }
  });

  const refresh = useCallback(async () => {
    setTasks(await repo.list());
  }, [repo]);

  // Load from Supabase on mount
  useEffect(() => { void refresh(); }, [refresh]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      await repo.create(input);
      await refresh();
    },
    [repo, refresh]
  );

  const updateTask = useCallback(
    async (id: string, patch: UpdateTaskInput) => {
      await repo.update(id, patch);
      await refresh();
    },
    [repo, refresh]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await repo.delete(id);
      await refresh();
    },
    [repo, refresh]
  );

  const reorderTasks = useCallback(
    async (updates: { id: string; sortOrder: number }[]) => {
      await repo.reorder(updates);
      await refresh();
    },
    [repo, refresh]
  );

  const value = useMemo(
    () => ({ tasks, refresh, createTask, updateTask, deleteTask, reorderTasks }),
    [tasks, refresh, createTask, updateTask, deleteTask, reorderTasks]
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}
