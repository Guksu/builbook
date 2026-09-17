import type { ProjectLabel } from "../lib/labels";

/** 관계도 노드 좌표(관계도 캔버스 기준 px). */
export interface NodePosition {
  x: number;
  y: number;
}

/** AI 발상 모델 선택지 — 실제 모델 id는 shared/ai-client가 맞춘다. */
export type AiModelChoice = "opus" | "sonnet";

// Project 엔티티 모델 (로컬 우선 · IndexedDB 저장). 로그인 없음 → owner 개념 없음.
export interface CompilePreset {
  id: string;
  name: string;
  /** 옵션 모양은 features/export-document가 정한다 — entities는 저장만 한다. */
  options: {
    fromEpisode: number | null;
    toEpisode: number | null;
    separator: "none" | "blank" | "stars";
    includeTitles: boolean;
    includeFolders: boolean;
    includeProjectTitle: boolean;
  };
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  // 작품 단위 목표 단어 수(선택). 미설정 시 undefined — 기존 레코드 호환.
  goal?: number;
  // 하루 목표 단어 수(선택). 집필 현황의 '오늘' 진행률 기준.
  dailyGoal?: number;
  // 회차 한 편의 목표 분량(공백 포함 글자 수, 선택). 연재 플랫폼 기준 5,500자 등.
  episodeGoal?: number;
  // 마감일(로컬 YYYY-MM-DD, 선택). 작품 목표와 함께 "하루 N자" 페이스를 계산한다.
  deadline?: string;
  // 작품별 라벨 목록(선택). 미설정이면 기본 라벨(DEFAULT_LABELS)을 쓰는 것으로 본다 —
  // 기존 레코드에 필드를 채워 넣지 않는다.
  labels?: ProjectLabel[];
  // 컴파일(내보내기) 프리셋(선택) — 이름 + 옵션. 백업에 함께 담긴다.
  compilePresets?: CompilePreset[];
  // 작품 장르 키(선택) — 영감 서랍의 카드 덱 선택에 쓴다. 키 목록은 features/idea-cards가 안다.
  genre?: string;
  // AI 발상에 쓸 모델(선택). 미설정이면 기본값(opus)으로 본다.
  aiModel?: AiModelChoice;
  // 인물 관계도의 노드 배치(인물 카드 문서 id → 좌표, 선택). 없는 인물은 자동 배치.
  relationLayout?: Record<string, NodePosition>;
  createdAt: string;
  updatedAt: string;
}
