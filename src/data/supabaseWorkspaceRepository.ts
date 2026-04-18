import { supabase } from "../lib/supabase";
import type { Workspace } from "./workspaceRepository";

function toWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  };
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toWorkspace);
}

export async function createSupabaseWorkspace(name: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return toWorkspace(data);
}

export async function renameSupabaseWorkspace(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSupabaseWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) throw error;
}
