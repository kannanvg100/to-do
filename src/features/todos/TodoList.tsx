import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PencilIcon, SpinnerIcon, TrashIcon } from "../../assets/icons";
import type { Task } from "../../types/task";
import { useTasks } from "./useTasks";

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}


// ── drag overlay row (cursor-following clone) ────────────────────────────────

function DragOverlayRow({ task, isLater }: { task: Task; isLater: boolean }) {
  return (
    <div
      className={`nb-row${isLater ? " nb-row--muted" : ""}`}
      style={{
        background: "var(--paper-1)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        borderRadius: 4,
        cursor: "grabbing",
      }}
    >
      <span className="nb-grip-wrapper" style={{ opacity: 1 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6C17.9 6 17 6.9 17 8C17 9.1 17.9 10 19 10C20.1 10 21 9.1 21 8C21 6.9 20.1 6 19 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M5 6C3.9 6 3 6.9 3 8C3 9.1 3.9 10 5 10C6.1 10 7 9.1 7 8C7 6.9 6.1 6 5 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M19 14C17.9 14 17 14.9 17 16C17 17.1 17.9 18 19 18C20.1 18 21 17.1 21 16C21 14.9 20.1 14 19 14Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M12 14C10.9 14 10 14.9 10 16C10 17.1 10.9 18 12 18C13.1 18 14 17.1 14 16C14 14.9 13.1 14 12 14Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M5 14C3.9 14 3 14.9 3 16C3 17.1 3.9 18 5 18C6.1 18 7 17.1 7 16C7 14.9 6.1 14 5 14Z" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      </span>
      <button type="button" className="nb-check" disabled />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nb-text">{task.title}</div>
      </div>
    </div>
  );
}

// ── sortable active-task row ─────────────────────────────────────────────────

function SortableRow({
  task,
  isNext,
  onCheck,
  onDelete,
  onRename,
  onMoveLater,
  isPending,
}: {
  task: Task;
  isNext: boolean;
  onCheck: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void> | void;
  onMoveLater: () => void;
  isPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isPending });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commit = async () => {
    const t = draft.trim();
    if (t && t !== task.title) {
      setEditing(false);
      await onRename(t);
    } else {
      setDraft(task.title);
      setEditing(false);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isPending ? 0.7 : 1,
  };

  const checkClass = `nb-check${isNext ? " nb-check--next" : ""}`;

  return (
    <div ref={setNodeRef} style={style} className="nb-row">
      {/* Drag grip */}
      <span className="nb-grip-wrapper" {...attributes} {...listeners}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 6C17.9 6 17 6.9 17 8C17 9.1 17.9 10 19 10C20.1 10 21 9.1 21 8C21 6.9 20.1 6 19 6Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
          <path
            d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
          <path
            d="M5 6C3.9 6 3 6.9 3 8C3 9.1 3.9 10 5 10C6.1 10 7 9.1 7 8C7 6.9 6.1 6 5 6Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
          <path
            d="M19 14C17.9 14 17 14.9 17 16C17 17.1 17.9 18 19 18C20.1 18 21 17.1 21 16C21 14.9 20.1 14 19 14Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
          <path
            d="M12 14C10.9 14 10 14.9 10 16C10 17.1 10.9 18 12 18C13.1 18 14 17.1 14 16C14 14.9 13.1 14 12 14Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
          <path
            d="M5 14C3.9 14 3 14.9 3 16C3 17.1 3.9 18 5 18C6.1 18 7 17.1 7 16C7 14.9 6.1 14 5 14Z"
            stroke="#aaa"
            stroke-width="1.5"
          />
        </svg>
      </span>

      <button
        type="button"
        className={checkClass}
        onClick={onCheck}
        aria-label="Mark complete"
        disabled={isPending}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            className="nb-text-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit();
              if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div className="nb-text">{task.title}</div>
        )}
      </div>

      {isPending ? (
        <SpinnerIcon
          className="animate-spin"
          style={{ width: 16, height: 16, color: "var(--ink-faint)", flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : (
        <div className="nb-trail">
          <button
            type="button"
            className="nb-row-action"
            onClick={() => { setDraft(task.title); setEditing(true); }}
            aria-label="Edit task"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="nb-today-pill"
            onClick={onMoveLater}
            aria-label="Move to later"
          >
            → later
          </button>
          <button
            type="button"
            className="nb-row-action nb-row-action--danger"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── later task row ───────────────────────────────────────────────────────────

function SortableLaterRow({
  task,
  onMoveToToday,
  onDelete,
  isPending,
}: {
  task: Task;
  onMoveToToday: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isPending });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isPending ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="nb-row nb-row--muted">
      <span className="nb-grip-wrapper" {...attributes} {...listeners}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6C17.9 6 17 6.9 17 8C17 9.1 17.9 10 19 10C20.1 10 21 9.1 21 8C21 6.9 20.1 6 19 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M5 6C3.9 6 3 6.9 3 8C3 9.1 3.9 10 5 10C6.1 10 7 9.1 7 8C7 6.9 6.1 6 5 6Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M19 14C17.9 14 17 14.9 17 16C17 17.1 17.9 18 19 18C20.1 18 21 17.1 21 16C21 14.9 20.1 14 19 14Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M12 14C10.9 14 10 14.9 10 16C10 17.1 10.9 18 12 18C13.1 18 14 17.1 14 16C14 14.9 13.1 14 12 14Z" stroke="#aaa" strokeWidth="1.5" />
          <path d="M5 14C3.9 14 3 14.9 3 16C3 17.1 3.9 18 5 18C6.1 18 7 17.1 7 16C7 14.9 6.1 14 5 14Z" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      </span>
      <button
        type="button"
        className="nb-check"
        onClick={onMoveToToday}
        aria-label="Move to today"
        disabled={isPending}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nb-text">{task.title}</div>
      </div>
      {isPending ? (
        <SpinnerIcon
          className="animate-spin"
          style={{ width: 16, height: 16, color: "var(--ink-faint)", flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : (
        <div className="nb-trail">
          <button
            type="button"
            className="nb-today-pill"
            onClick={onMoveToToday}
            aria-label="Move to today"
          >
            ↑ today
          </button>
          <button
            type="button"
            className="nb-row-action nb-row-action--danger"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── completed task row ───────────────────────────────────────────────────────

function DoneRow({
  task,
  onUncheck,
  onDelete,
  isPending,
}: {
  task: Task;
  onUncheck: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="nb-row nb-row--done"
      style={{ opacity: isPending ? 0.7 : 1 }}
    >
      <span style={{ width: 24, flexShrink: 0 }} />
      <button
        type="button"
        className="nb-check nb-check--done"
        onClick={onUncheck}
        aria-label="Mark incomplete"
        disabled={isPending}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nb-text">{task.title}</div>
      </div>
      {isPending ? (
        <SpinnerIcon
          className="animate-spin"
          style={{ width: 16, height: 16, color: "var(--ink-faint)", flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : (
        <div className="nb-trail">
          <button
            type="button"
            className="nb-row-action nb-row-action--danger"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── main list component ──────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TodoList({ workspaceId: _workspaceId }: { workspaceId: string }) {
  const { tasks, createTask, updateTask, deleteTask, reorderTasks } = useTasks();
  const [title, setTitle] = useState("");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [laterOpen, setLaterOpen] = useState(true);
  const [laterIds, setLaterIds] = useState<Set<string>>(new Set());
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    taskId: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Date header
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const dateStr = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;
  const hour = now.getHours();
  const timeOfDay =
    hour < 12 ? "the morning" : hour < 17 ? "the afternoon" : "the evening";
  const weekNum = getWeekNumber(now);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // Initialize order and laterIds from server on first non-empty load
  useEffect(() => {
    if (initialized.current || tasks.length === 0) return;
    initialized.current = true;
    setOrderedIds(tasks.map((t) => t.id));
    setLaterIds(new Set(tasks.filter((t) => t.isLater && !t.completed).map((t) => t.id)));
  }, [tasks]);

  const normalizedOrderedIds = useMemo(() => {
    const incomingIds = tasks.map((t) => t.id);
    const existingIds = new Set(orderedIds);
    const addedIds = incomingIds.filter((id) => !existingIds.has(id));
    const retainedIds = orderedIds.filter((id) => taskMap.has(id));
    return [...addedIds, ...retainedIds];
  }, [orderedIds, taskMap, tasks]);

  const sensors = useSensors(useSensor(PointerSensor));

  const withPendingTask = async (
    taskId: string,
    action: () => Promise<void>,
  ) => {
    setPendingTaskIds((ids) => (ids.includes(taskId) ? ids : [...ids, taskId]));
    try {
      await action();
    } finally {
      setPendingTaskIds((ids) => ids.filter((id) => id !== taskId));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = taskMap.get(event.active.id as string);
    if (task) setDraggingTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = active.data.current?.sortable?.containerId as string | undefined;
    const overContainer = over.data.current?.sortable?.containerId as string | undefined;
    const activeIsLater = activeContainer === "later";
    const overIsLater = overContainer === "later";

    // Cross-section: flip section optimistically + persist to DB
    if (activeIsLater !== overIsLater) {
      setLaterIds((prev) => {
        const next = new Set(prev);
        if (activeIsLater) next.delete(activeId);
        else next.add(activeId);
        return next;
      });
      void withPendingTask(activeId, () =>
        updateTask(activeId, { isLater: !activeIsLater })
      );
      return;
    }

    // Same-section reorder: optimistic UI + persist sort_order to DB
    const sectionTasks = activeIsLater ? laterTasks : todayTasks;
    const oldIndex = sectionTasks.findIndex((t) => t.id === activeId);
    const newIndex = sectionTasks.findIndex((t) => t.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove([...sectionTasks], oldIndex, newIndex);
    const updates = reordered.map((t, idx) => ({ id: t.id, sortOrder: idx * 1000 }));

    // Optimistic local reorder
    const actIds = normalizedOrderedIds.filter((id) => !taskMap.get(id)?.completed);
    const completedIds = normalizedOrderedIds.filter((id) => taskMap.get(id)?.completed);
    setOrderedIds([...arrayMove(actIds, actIds.indexOf(activeId), actIds.indexOf(overId)), ...completedIds]);

    void reorderTasks(updates);
  };

  const handleAddKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || isCreating) return;
    const t = title.trim();
    if (!t) return;
    setIsCreating(true);
    try {
      await createTask({
        title: t,
        dueDate: new Date().toISOString().slice(0, 10),
        recurrence: null,
      });
      setTitle("");
    } finally {
      setIsCreating(false);
      requestAnimationFrame(() => createInputRef.current?.focus());
    }
  };

  const handleComplete = (task: Task) => {
    void withPendingTask(task.id, () =>
      updateTask(task.id, { completed: true }),
    );
    const truncated =
      task.title.slice(0, 40) + (task.title.length > 40 ? "…" : "");
    setToast({ message: `"${truncated}" done.`, taskId: task.id });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const handleUndo = () => {
    if (!toast) return;
    void withPendingTask(toast.taskId, () =>
      updateTask(toast.taskId, { completed: false }),
    );
    setToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        createInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const ordered = normalizedOrderedIds.flatMap((id) => {
    const t = taskMap.get(id);
    return t ? [t] : [];
  });
  const active = ordered.filter((t) => !t.completed);
  const todayTasks = active.filter((t) => !laterIds.has(t.id));
  const laterTasks = active.filter((t) => laterIds.has(t.id));
  const completed = ordered.filter((t) => t.completed);
  const total = active.length + completed.length;
  const pct = total > 0 ? (completed.length / total) * 100 : 0;
  const todayTaskIds = todayTasks.map((t) => t.id);
  const laterTaskIds = laterTasks.map((t) => t.id);

  return (
    <>
      {/* Page header */}
      <div className="nb-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nb-stamp">Week {weekNum}</div>
          <div className="nb-date">{dayName}</div>
          <div className="nb-sub">
            {dateStr} · {timeOfDay}
          </div>
        </div>
        <div className="nb-meta">
          <div>
            <strong>{active.length}</strong> open
          </div>
          <div>
            <strong>{completed.length}</strong> done · {Math.round(pct)}%
          </div>
          {/* <div style={{ marginTop: 6 }}>week {weekNum}</div> */}
        </div>
      </div>

      {/* Tasks */}
      <div>
        {/* Today section header */}
        {(todayTasks.length > 0 || laterTasks.length > 0) && (
          <div className="nb-section-header">
            <span style={{ width: 24, flexShrink: 0 }} />
            <span className="nb-sh-text" style={{ cursor: "default" }}>
              <span>— today</span>
              <span className="nb-sh-count">{todayTasks.length} items</span>
            </span>
          </div>
        )}

        {/* Add row */}
        <div className="nb-add-row">
          <span className="nb-add-plus">+</span>
          <input
            ref={createInputRef}
            className="nb-add-input"
            placeholder="add a line…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleAddKeyDown}
            disabled={isCreating}
          />
          {isCreating ? (
            <SpinnerIcon
              className="animate-spin"
              style={{
                width: 16,
                height: 16,
                color: "var(--ink-faint)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
          ) : (
            <span className="nb-add-hint">
              <span className="nb-kbd">⌘N</span>new
            </span>
          )}
        </div>

        {/* Today + Later tasks — two SortableContexts inside one DndContext */}
        {active.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext id="today" items={todayTaskIds} strategy={verticalListSortingStrategy}>
              {todayTasks.map((task, i) => (
                <SortableRow
                  key={task.id}
                  task={task}
                  isNext={i === 0}
                  onCheck={() => handleComplete(task)}
                  onDelete={() =>
                    void withPendingTask(task.id, () => deleteTask(task.id))
                  }
                  onRename={(t) =>
                    withPendingTask(task.id, () => updateTask(task.id, { title: t }))
                  }
                  onMoveLater={() => {
                    setLaterIds((prev) => new Set([...prev, task.id]));
                    void withPendingTask(task.id, () => updateTask(task.id, { isLater: true }));
                  }}
                  isPending={pendingTaskIds.includes(task.id)}
                />
              ))}
            </SortableContext>

            {laterTasks.length > 0 && (
              <>
                <div className="nb-section-header">
                  <span style={{ width: 24, flexShrink: 0 }} />
                  <button
                    type="button"
                    className="nb-sh-text"
                    onClick={() => setLaterOpen((o) => !o)}
                  >
                    <span className={`nb-sh-caret${laterOpen ? "" : " nb-sh-caret--collapsed"}`}>
                      ▾
                    </span>
                    <span>— later</span>
                    <span className="nb-sh-count">{laterTasks.length} items</span>
                  </button>
                </div>
                <SortableContext id="later" items={laterTaskIds} strategy={verticalListSortingStrategy}>
                  {laterOpen &&
                    laterTasks.map((task) => (
                      <SortableLaterRow
                        key={task.id}
                        task={task}
                        onMoveToToday={() => {
                          setLaterIds((prev) => {
                            const next = new Set(prev);
                            next.delete(task.id);
                            return next;
                          });
                          void withPendingTask(task.id, () => updateTask(task.id, { isLater: false }));
                        }}
                        onDelete={() =>
                          void withPendingTask(task.id, () => deleteTask(task.id))
                        }
                        isPending={pendingTaskIds.includes(task.id)}
                      />
                    ))}
                </SortableContext>
              </>
            )}

            <DragOverlay dropAnimation={null}>
              {draggingTask && (
                <DragOverlayRow
                  task={draggingTask}
                  isLater={laterIds.has(draggingTask.id)}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Done section */}
        {completed.length > 0 && (
          <>
            <div className="nb-section-header">
              <span style={{ width: 24, flexShrink: 0 }} />
              <button
                type="button"
                className="nb-sh-text"
                onClick={() => setCompletedOpen((o) => !o)}
              >
                <span
                  className={`nb-sh-caret${completedOpen ? "" : " nb-sh-caret--collapsed"}`}
                >
                  ▾
                </span>
                <span>— done · today</span>
                <span className="nb-sh-count">{completed.length} cleared</span>
              </button>
            </div>
            {completedOpen &&
              completed.map((task) => (
                <DoneRow
                  key={task.id}
                  task={task}
                  onUncheck={() =>
                    void withPendingTask(task.id, () =>
                      updateTask(task.id, { completed: false }),
                    )
                  }
                  onDelete={() =>
                    void withPendingTask(task.id, () => deleteTask(task.id))
                  }
                  isPending={pendingTaskIds.includes(task.id)}
                />
              ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="nb-footer">
        <div className="nb-progress">
          <span>progress</span>
          <div className="nb-progress-bar">
            <div className="nb-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>
            {completed.length}/{total}
          </span>
        </div>
        <div className="nb-scribble">— signed, you</div>
      </div>

      {/* Toast */}
      <div className={`nb-toast${toast ? " nb-toast--show" : ""}`}>
        <span>{toast?.message}</span>
        <button type="button" onClick={handleUndo}>
          Undo
        </button>
      </div>
    </>
  );
}
