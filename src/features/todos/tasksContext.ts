import { createContext } from "react";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../../types/task";

export type TasksContextValue = {
  tasks: Task[];
  refresh: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, patch: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
};

export const TasksContext = createContext<TasksContextValue | null>(null);
