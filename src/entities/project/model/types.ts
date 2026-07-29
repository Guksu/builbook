// Project 엔티티 모델 (로컬 우선 · IndexedDB 저장). 로그인 없음 → owner 개념 없음.
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
  createdAt: string;
  updatedAt: string;
}
