// Document(바인더 노드) 엔티티 모델. API 계약(_workspace/03)과 1:1 일치.
import type { DocumentKind } from "../lib/templates";

export type DocType = "FOLDER" | "DOC";

export interface DocumentNode {
  id: string;
  projectId: string;
  parentId: string | null;
  type: DocType;
  title: string;
  order: number;
  content: unknown | null;
  synopsis: string | null;
  wordCount: number;
  // 공백 포함 글자 수 / 공백 제외 글자 수(2026-09 글자 수 기준 도입). 옛 레코드는 없을 수 있어
  // 선택 필드 — 읽을 때 measureDocument가 본문에서 다시 센다.
  charCount?: number;
  charCountNoSpace?: number;
  // 문서 종류(선택): 회차(원고) / 인물 카드 / 설정 카드. 없으면 회차 — 회차 분량표·내보내기는 원고만 본다.
  kind?: DocumentKind;
  // 문서 단위 목표 단어 수(선택). 미설정 시 undefined — 기존 레코드 호환.
  goal?: number;
  // 진행 상태(선택): "draft"(초고) | "revise"(퇴고) | "done"(완료).
  // 미설정은 초고로 본다 — 기존 레코드에 필드를 채워 넣을 필요가 없다.
  status?: string;
  // 라벨 id(선택) — 작품의 Project.labels 중 하나를 가리킨다. 라벨이 지워지면 비워진다.
  label?: string;
  // 문서 메모(선택) — 스크리브너의 Document Notes. 독자에게 보일 요약인 시놉시스와 달리
  // 작가 혼자 보는 작업 메모(고칠 것·자료 링크 등)다.
  note?: string;
  // 소프트 삭제 시각(ISO). 있으면 '휴지통' 상태 — 바인더·검색·목표 합계에서 제외.
  // 미설정(undefined)이면 정상 문서 — 기존 레코드는 필드가 없으므로 자동으로 정상 처리된다.
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
}
