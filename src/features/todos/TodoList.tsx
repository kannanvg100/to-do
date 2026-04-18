import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckboxContent,
  CheckboxControl,
  CheckboxIndicator,
  CheckboxRoot,
  Input,
} from "@heroui/react";
import {
  ChevronRightIcon,
  DragHandleIcon,
  PencilIcon,
  TrashIcon,
} from "../../assets/icons";
import type { Task } from "../../types/task";
import { useTasks } from "./useTasks";

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      aria-label="Delete task"
      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 opacity-0 pointer-events-none transition-[opacity,color,background-color] group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
    >
      <TrashIcon aria-hidden="true" />
    </button>
  );
}

function SortableItem({
  task,
  onToggle,
  onDelete,
  onRename,
}: {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== task.title) onRename(task.id, t);
    else setDraft(task.title);
    setEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-1 rounded-lg"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <DragHandleIcon className="text-zinc-300 dark:text-zinc-600 shrink-0" />
      </span>
      <CheckboxRoot
        isSelected={task.completed}
        onChange={(v) => onToggle(task.id, v)}
      >
        <CheckboxControl>
          <CheckboxIndicator />
        </CheckboxControl>
      </CheckboxRoot>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(task.title); setEditing(false); }
          }}
          className="flex-1 rounded px-1 py-0.5 text-sm text-zinc-900 outline outline-zinc-300 focus:outline-blue-500"
        />
      ) : (
        <span className={`flex-1 text-sm ${task.completed ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
          {task.title}
        </span>
      )}
      <button
        type="button"
        aria-label="Edit task"
        onClick={() => { setDraft(task.title); setEditing(true); }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 opacity-0 pointer-events-none transition-[opacity,color,background-color] group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-zinc-100 hover:text-zinc-700"
      >
        <PencilIcon aria-hidden="true" />
      </button>
      <DeleteButton onDelete={() => onDelete(task.id)} />
    </li>
  );
}

function orderKey(workspaceId: string): string {
  return `hero-todos:order:${workspaceId}`;
}

function loadOrder(workspaceId: string): string[] {
  try {
    const raw = localStorage.getItem(orderKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function saveOrder(workspaceId: string, ids: string[]): void {
  localStorage.setItem(orderKey(workspaceId), JSON.stringify(ids));
}

export function TodoList({ workspaceId }: { workspaceId: string }) {
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const [title, setTitle] = useState("");
  const [orderedIds, setOrderedIds] = useState<string[]>(() => loadOrder(workspaceId));
  const [completedOpen, setCompletedOpen] = useState(false);

  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const normalizedOrderedIds = useMemo(() => {
    const incomingIds = tasks.map((task) => task.id);
    const existingIds = new Set(orderedIds);
    const addedIds = incomingIds.filter((id) => !existingIds.has(id));
    const retainedIds = orderedIds.filter((id) => taskMap.has(id));

    return [...addedIds, ...retainedIds];
  }, [orderedIds, taskMap, tasks]);

  // Persist the normalized order without triggering an extra render.
  useEffect(() => {
    saveOrder(workspaceId, normalizedOrderedIds);
  }, [normalizedOrderedIds, workspaceId]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const t = title.trim();
    if (!t) return;
    await createTask({
      title: t,
      dueDate: new Date().toISOString().slice(0, 10),
      recurrence: null,
    });
    setTitle("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIds = normalizedOrderedIds.filter((id) => {
      const task = taskMap.get(id);
      return task ? !task.completed : false;
    });
    const completedIds = normalizedOrderedIds.filter((id) => {
      const task = taskMap.get(id);
      return task ? task.completed : false;
    });

    const oldIndex = activeIds.indexOf(active.id as string);
    const newIndex = activeIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextActiveIds = arrayMove(activeIds, oldIndex, newIndex);
    setOrderedIds([...nextActiveIds, ...completedIds]);
  };

  const ordered = normalizedOrderedIds.flatMap((id) => {
    const t = taskMap.get(id);
    return t ? [t] : [];
  });

  const active = ordered.filter((t) => !t.completed);
  const completed = ordered.filter((t) => t.completed);
  const activeIds = active.map((t) => t.id);

  return (
    <div className="flex flex-col gap-6 w-full">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a task"
        variant="secondary"
      />

      {active.length === 0 && completed.length === 0 && (
        <p className="text-sm text-zinc-400">No tasks yet. Type above and press Enter to add one.</p>
      )}

      {active.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-px">
              {active.map((task) => (
                <SortableItem
                  key={task.id}
                  task={task}
                  onToggle={(id, v) => void updateTask(id, { completed: v })}
                  onDelete={(id) => void deleteTask(id)}
                  onRename={(id, t) => void updateTask(id, { title: t })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((o) => !o)}
            className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 w-fit"
          >
            <ChevronRightIcon
              className={`transition-transform ${completedOpen ? "rotate-90" : ""}`}
            />
            Completed ({completed.length})
          </button>

          {completedOpen && (
            <ul className="flex flex-col gap-2">
              {completed.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-2 px-1"
                >
                  <span className="w-4 shrink-0" />
                  <CheckboxRoot
                    isSelected={task.completed}
                    onChange={(v) => void updateTask(task.id, { completed: v })}
                  >
                    <CheckboxControl>
                      <CheckboxIndicator />
                    </CheckboxControl>
                    <CheckboxContent className="text-zinc-400 line-through">
                      {task.title}
                    </CheckboxContent>
                  </CheckboxRoot>
                  <DeleteButton onDelete={() => void deleteTask(task.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
