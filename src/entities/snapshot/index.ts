export type { Snapshot } from "./model/types";
export {
  useSnapshots,
  snapshotsKey,
  getSnapshot,
  createSnapshotRecord,
  deleteSnapshotsForDocuments,
  type CreateSnapshotInput,
} from "./api/useSnapshots";
