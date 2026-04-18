import { useEffect, useMemo, useState } from "react";
import { createSupabaseTaskRepository } from "../../data/supabaseTaskRepository";
import {
  createSupabaseWorkspace,
  deleteSupabaseWorkspace,
  fetchWorkspaces,
  renameSupabaseWorkspace,
} from "../../data/supabaseWorkspaceRepository";
import { writeActiveWorkspaceId, readActiveWorkspaceId } from "../../data/workspaceRepository";
import type { Workspace } from "../../data/workspaceRepository";
import { HamburgerIcon } from "../../assets/icons";
import { CalendarMonth } from "./CalendarMonth";
import { Sidebar } from "./Sidebar";
import { TaskProvider } from "./TaskProvider";
import { TodoList } from "./TodoList";
import { Tabs } from "@heroui/react";

export function TodoApp() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces().then((ws) => {
      if (ws.length === 0) {
        // Create default workspace if none exist
        createSupabaseWorkspace("My Tasks").then((created) => {
          setWorkspaces([created]);
          setActiveId(created.id);
          writeActiveWorkspaceId(created.id);
          setLoading(false);
        });
        return;
      }
      setWorkspaces(ws);
      const savedId = readActiveWorkspaceId();
      const resolved = (savedId && ws.find((w) => w.id === savedId)) ? savedId : ws[0]!.id;
      setActiveId(resolved);
      writeActiveWorkspaceId(resolved);
      setLoading(false);
    });
  }, []);

  const handleSelect = (id: string) => {
    writeActiveWorkspaceId(id);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleAdd = async (name: string) => {
    const ws = await createSupabaseWorkspace(name);
    setWorkspaces((prev) => [...prev, ws]);
    handleSelect(ws.id);
  };

  const handleRename = async (id: string, name: string) => {
    await renameSupabaseWorkspace(id, name);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
  };

  const handleDelete = async (id: string) => {
    await deleteSupabaseWorkspace(id);
    const next = workspaces.filter((w) => w.id !== id);
    setWorkspaces(next);
    if (activeId === id && next.length > 0) handleSelect(next[0]!.id);
  };

  const repo = useMemo(
    () => (activeId ? createSupabaseTaskRepository(activeId) : null),
    [activeId],
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeId);

  if (loading || !repo || !activeWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen w-full">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-zinc-200 p-4 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          workspaces={workspaces}
          activeId={activeId}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto px-6 py-6">
        <TaskProvider key={activeId} repo={repo} workspaceId={activeId}>
          <Tabs defaultSelectedKey="list">
            <header className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Toggle sidebar"
                  onClick={() => setSidebarOpen((o) => !o)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <HamburgerIcon />
                </button>
                <h1 className="text-xl font-medium tracking-tight text-zinc-900 truncate">
                  {activeWorkspace.name}
                </h1>
              </div>
              <Tabs.ListContainer>
                <Tabs.List aria-label="Task views">
                  <Tabs.Tab id="list">
                    List
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="calendar">
                    Calendar
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </header>

            <div className="min-h-screen">
              <Tabs.Panel id="list">
                <TodoList workspaceId={activeId} />
              </Tabs.Panel>
              <Tabs.Panel id="calendar">
                <CalendarMonth />
              </Tabs.Panel>
            </div>
          </Tabs>
        </TaskProvider>
      </main>
    </div>
  );
}
