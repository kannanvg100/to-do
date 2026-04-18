import { useState } from "react";
import type { Workspace } from "../../data/workspaceRepository";
import { PencilIcon, TrashIcon } from "../../assets/icons";
import { useAuth } from "../auth/AuthContext";

function WorkspaceItem({
  workspace,
  isActive,
  onSelect,
  onRenamed,
  onDeleted,
  canDelete,
}: {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onRenamed: (id: string, name: string) => void;
  onDeleted: (id: string) => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(false);
  const [draft, setDraft] = useState(workspace.name);

  const commit = () => {
    const name = draft.trim();
    if (name && name !== workspace.name) onRenamed(workspace.id, name);
    else setDraft(workspace.name);
    setEditing(false);
  };

  const handleClick = () => {
    onSelect();
    setSelected((s) => !s);
  };

  return (
    <li
      className="relative flex items-center gap-1 rounded-lg px-2"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSelected(false); }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(workspace.name); setEditing(false); }
          }}
          className="flex-1 rounded px-1 py-1 text-sm text-zinc-900 outline outline-zinc-300 focus:outline-blue-500"
        />
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
            isActive
              ? "bg-zinc-200 font-medium text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          {workspace.name}
        </button>
      )}

      {!editing && selected && (
        <div className="flex shrink-0">
          <button
            type="button"
            aria-label="Rename workspace"
            onClick={() => { setDraft(workspace.name); setEditing(true); setSelected(false); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <PencilIcon />
          </button>
          {canDelete && (
            <button
              type="button"
              aria-label="Delete workspace"
              onClick={() => onDeleted(workspace.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-red-500"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function Sidebar({
  workspaces,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: {
  workspaces: Workspace[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { user, signOut } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (name) onAdd(name);
    setNewName("");
    setAdding(false);
  };

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col gap-2 pr-1">
      <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Workspaces
      </p>
      <ul className="flex flex-col gap-1">
        {workspaces.map((ws) => (
          <WorkspaceItem
            key={ws.id}
            workspace={ws}
            isActive={ws.id === activeId}
            onSelect={() => onSelect(ws.id)}
            onRenamed={onRename}
            onDeleted={onDelete}
            canDelete={workspaces.length > 1}
          />
        ))}
      </ul>

      {adding ? (
        <div className="px-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setNewName(""); setAdding(false); }
            }}
            placeholder="Workspace name"
            className="w-full rounded px-2 py-1 text-sm text-zinc-900 outline outline-zinc-300 focus:outline-blue-500"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mx-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <span className="text-base leading-none">+</span>
          New
        </button>
      )}
      <div className="mt-auto border-t border-zinc-200 pt-3 px-2">
        <p className="truncate text-xs text-zinc-400 mb-1.5">{user?.email}</p>
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-md py-1.5 text-left text-sm text-zinc-500"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
