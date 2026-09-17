export type { Project, CompilePreset, AiModelChoice } from "./model/types";
export { useProjects, useProject, projectKey } from "./api/useProjects";
export {
  LABEL_COLORS,
  LABEL_COLOR_LABEL,
  LABEL_COLOR_CLASS,
  DEFAULT_LABELS,
  withDefaultLabels,
  isLabelColor,
  findLabel,
  addLabel,
  renameLabel,
  removeLabel,
  type ProjectLabel,
  type LabelColor,
} from "./lib/labels";
