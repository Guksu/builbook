// StoryEvent(타임라인 사건) 엔티티 모델 — 작품 안에서 "언제 무슨 일이 있었나"를 적는 연표.
// 원고(바인더)와 별개다: 서술 순서와 사건 순서가 다른 이야기(회상·복선)를 다루려면
// 사건을 원고 밖에 따로 세워 두고 회차와 느슨하게 연결하는 편이 낫다.
export interface StoryEvent {
  id: string;
  projectId: string;
  /** 사건 이름. 예) "주인공 회귀". */
  title: string;
  /** 작중 시점 — 자유 서술. 예) "1024년 봄", "회귀 3일 차". 형식을 강제하지 않는다. */
  when: string;
  /** 사건 설명(선택). */
  body: string;
  /** 이 사건이 그려지는 회차(선택). 문서가 사라지면 연결만 끊긴 것으로 본다. */
  documentId: string | null;
  /** 연표 내 순서(0부터). 위/아래 이동으로 바뀐다. */
  order: number;
  createdAt: string;
  updatedAt: string;
}
