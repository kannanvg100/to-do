import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronRightIcon } from "../../assets/icons";
import {
  calendarDeltaNewDueDate,
  expandTasksForRange,
  formatLocalDateKey,
  type CalendarTaskItem,
} from "../../lib/recurrence";
import { useTasks } from "./useTasks";

const WEEK_STARTS_ON = 1 as const;

function DraggableTaskChip({ item }: { item: CalendarTaskItem }) {
  const dragId = `drag-${item.task.id}-${item.occurrenceDate}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: {
        taskId: item.task.id,
        occurrenceDate: item.occurrenceDate,
      },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const { task } = item;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-800 ${
        task.completed ? "text-zinc-400 line-through opacity-70" : "text-zinc-800 dark:text-zinc-100"
      } ${isDragging ? "opacity-50" : ""}`}
      title="Drag to another day"
    >
      {task.title}
    </div>
  );
}

function DayDropCell({
  dateKey,
  day,
  inMonth,
  items,
}: {
  dateKey: string;
  day: Date;
  inMonth: boolean;
  items: CalendarTaskItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[100px] flex-col gap-1 border-t border-l border-zinc-200 p-1 sm:min-h-[120px] ${
        isOver
          ? "bg-blue-50"
          : inMonth
            ? "bg-white"
            : "bg-zinc-100"
      }`}
    >
      <span
        className={`text-xs font-medium ${
          inMonth ? "text-zinc-700" : "text-zinc-400"
        }`}
      >
        {format(day, "d")}
      </span>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <DraggableTaskChip key={`${item.task.id}-${item.occurrenceDate}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function CalendarMonth() {
  const { tasks, updateTask } = useTasks();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const { gridStart, gridEnd, byDate } = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    const byDate = expandTasksForRange(tasks, gridStart, gridEnd);
    return { gridStart, gridEnd, byDate };
  }, [tasks, cursor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const taskId = active.data.current?.taskId as string | undefined;
    const occurrenceDate = active.data.current?.occurrenceDate as string | undefined;
    if (!taskId || !occurrenceDate) return;
    const targetKey = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextDue = calendarDeltaNewDueDate(task, occurrenceDate, targetKey);
    void updateTask(taskId, { dueDate: nextDue });
  };

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {format(cursor, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setCursor((d) => subMonths(d, 1))}
            aria-label="Previous month"
          >
            <ChevronRightIcon className="rotate-180" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setCursor((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="grid min-w-[640px] grid-cols-7">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="border-b border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-xs font-semibold text-zinc-600"
              >
                {w}
              </div>
            ))}
            {days.map((day) => {
              const dateKey = formatLocalDateKey(day);
              const inMonth = isSameMonth(day, cursor);
              const items = byDate.get(dateKey) ?? [];
              return (
                <DayDropCell
                  key={dateKey}
                  dateKey={dateKey}
                  day={day}
                  inMonth={inMonth}
                  items={items}
                />
              );
            })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
