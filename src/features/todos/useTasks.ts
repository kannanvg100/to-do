import { useContext } from "react";
import { TasksContext, type TasksContextValue } from "./tasksContext";

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
