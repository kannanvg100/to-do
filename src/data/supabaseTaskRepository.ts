import { supabase } from "../lib/supabase";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/task";
import type { TaskRepository } from "./taskRepository";

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: row.completed as boolean,
    dueDate: row.due_date as string,
    recurrence: row.recurrence as Task["recurrence"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    sortOrder: row.sort_order != null ? (row.sort_order as number) : null,
    isLater: (row.is_later as boolean) ?? false,
  };
}

export function createSupabaseTaskRepository(workspaceId: string): TaskRepository {
  return {
    async list() {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toTask);
    },

    async create(input: CreateTaskInput) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          workspace_id: workspaceId,
          title: input.title.trim(),
          completed: false,
          due_date: input.dueDate,
          recurrence: input.recurrence ?? null,
          sort_order: null,
          is_later: false,
        })
        .select()
        .single();
      if (error) throw error;
      return toTask(data);
    },

    async update(id: string, patch: UpdateTaskInput) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.title !== undefined) updates.title = patch.title.trim();
      if (patch.completed !== undefined) updates.completed = patch.completed;
      if (patch.dueDate !== undefined) updates.due_date = patch.dueDate;
      if (patch.recurrence !== undefined) updates.recurrence = patch.recurrence;
      if (patch.isLater !== undefined) updates.is_later = patch.isLater;
      if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return toTask(data);
    },

    async delete(id: string) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },

    async reorder(updates: { id: string; sortOrder: number }[]) {
      await Promise.all(
        updates.map(({ id, sortOrder }) =>
          supabase.from("tasks").update({ sort_order: sortOrder }).eq("id", id)
        )
      );
    },
  };
}
