export type { WritingLog } from "./model/types";
export {
  useWritingLogs,
  writingLogsKey,
  recordWriting,
  deleteWritingLogsForProject,
} from "./api/useWritingLogs";
export {
  activeDays,
  applyDelta,
  averagePerActiveDay,
  bestDay,
  buildSeries,
  computeStreak,
  dateKey,
  estimateDaysToGoal,
  logId,
  longestStreak,
  shiftDateKey,
  totalWritten,
  writtenOn,
  type DayPoint,
} from "./lib/stats";
