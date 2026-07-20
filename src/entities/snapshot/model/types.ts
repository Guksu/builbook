// Snapshot(문서 버전 히스토리) 엔티티 모델.
// 특정 시점의 문서 본문·제목·글자수를 한 벌로 얼려 둔 불변 레코드.
export interface Snapshot {
  id: string;
  documentId: string;
  projectId: string;
  /** 스냅샷 당시 문서 제목(스냅). 이후 문서 제목이 바뀌어도 이 값은 유지된다. */
  title: string;
  /** ProseMirror JSON. 문서 content와 동일 구조. */
  content: unknown | null;
  wordCount: number;
  /** 선택 메모. 없으면 null. */
  note: string | null;
  createdAt: string;
}
