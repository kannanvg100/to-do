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

type View = "list" | "calendar";

export function TodoApp() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces().then((ws) => {
      if (ws.length === 0) {
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
      const resolved =
        savedId && ws.find((w) => w.id === savedId) ? savedId : ws[0]!.id;
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
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Caveat, cursive",
          fontSize: 28,
          color: "var(--ink-soft)",
        }}
      >
        loading…
      </div>
    );
  }

  return (
    <>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            background: "rgba(0,0,0,0.2)",
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 30,
          width: 224,
          background: "white",
          borderRight: "1px solid #E5E7EB",
          padding: 8,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms",
        }}
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

      {/* Topbar */}
      <div className="nb-topbar">
        <div className="nb-crumb">
          <button
            className="nb-icon-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            title="Workspaces"
          >
            <HamburgerIcon />
          </button>
          <span className="nb-crumb-dot" />
          <span>{activeWorkspace.name.toLowerCase()}</span>
        </div>
        <div className="nb-topbar-actions">
          <button
            className="nb-icon-btn"
            title={view === "list" ? "Calendar view" : "List view"}
            onClick={() => setView((v) => (v === "list" ? "calendar" : "list"))}
          >
            {view === "list" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <TaskProvider key={activeId} repo={repo} workspaceId={activeId}>
        {view === "calendar" ? (
          <div style={{ padding: "72px 24px 96px", minHeight: "100vh" }}>
            <CalendarMonth />
          </div>
        ) : (
          <div className="nb-stage">
            <div className="notebook">
              <div className="nb-binding" />
              <div className="nb-binding-holes">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <span key={i} className="nb-hole" />
                ))}
              </div>
              <div className="nb-page">
                <div className="nb-margin-line" />
                <TodoList workspaceId={activeId} />
              </div>
            </div>
          </div>
        )}
      </TaskProvider>
    </>
  );
}
