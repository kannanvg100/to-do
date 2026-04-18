import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { RRule } from "rrule";
import type { Task } from "../types/task";

/** Parse YYYY-MM-DD as a local calendar date (noon to reduce DST edge cases). */
export function parseLocalDateKey(ymd: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatLocalDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function taskToRRule(task: Task): RRule | null {
  if (!task.recurrence) return null;
  const dtstart = parseLocalDateKey(task.dueDate);
  const freq =
    task.recurrence.freq === "DAILY"
      ? RRule.DAILY
      : task.recurrence.freq === "WEEKLY"
        ? RRule.WEEKLY
        : RRule.MONTHLY;
  return new RRule({
    freq,
    interval: task.recurrence.interval ?? 1,
    dtstart,
  });
}

export type CalendarTaskItem = {
  task: Task;
  /** Calendar day this row/cell represents; used as DnD source for recurring tasks. */
  occurrenceDate: string;
};

/**
 * Map each date key in [rangeStart, rangeEnd] to visible task occurrences.
 */
export function expandTasksForRange(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, CalendarTaskItem[]> {
  const start = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);
  const map = new Map<string, CalendarTaskItem[]>();

  const push = (dateKey: string, item: CalendarTaskItem) => {
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  };

  for (const task of tasks) {
    if (!task.recurrence) {
      const due = parseLocalDateKey(task.dueDate);
      if (isWithinInterval(due, { start, end })) {
        push(task.dueDate, { task, occurrenceDate: task.dueDate });
      }
      continue;
    }

    const rule = taskToRRule(task);
    if (!rule) continue;
    for (const d of rule.between(start, end, true)) {
      const key = formatLocalDateKey(d);
      push(key, { task, occurrenceDate: key });
    }
  }

  for (const [, items] of map) {
    items.sort((a, b) => a.task.title.localeCompare(b.task.title));
  }

  return map;
}

/**
 * New anchor dueDate after dragging from one calendar cell to another (series shift for recurring).
 */
export function calendarDeltaNewDueDate(
  task: Task,
  fromOccurrenceDate: string,
  toDateKey: string
): string {
  const delta = differenceInCalendarDays(
    parseLocalDateKey(toDateKey),
    parseLocalDateKey(fromOccurrenceDate)
  );
  return formatLocalDateKey(addDays(parseLocalDateKey(task.dueDate), delta));
}
