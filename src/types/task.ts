/** Matches rrule.RRule frequency constants after mapping */
export type TaskRecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY";

export type TaskRecurrence = {
  freq: TaskRecurrenceFreq;
  /** Defaults to 1 */
  interval?: number;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  /** Local calendar day YYYY-MM-DD */
  dueDate: string;
  recurrence: TaskRecurrence | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number | null;
  isLater: boolean;
};

export type CreateTaskInput = {
  title: string;
  dueDate: string;
  recurrence?: TaskRecurrence | null;
};

export type UpdateTaskInput = Partial<
  Pick<Task, "title" | "completed" | "dueDate" | "recurrence" | "isLater" | "sortOrder">
>;
