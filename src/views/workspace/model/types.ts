// 작업실 화면이 훅↔컴포넌트 사이로 넘기는 공용 타입.
// 엔티티 훅의 반환을 그대로 가리켜(ReturnType) 문서·작품 액션 시그니처가 어긋나지 않게 한다.
import type { useDocuments } from "@entities/document";
import type { useProject } from "@entities/project";

/** useDocuments가 돌려주는 문서 목록 + 갱신 액션 묶음. */
export type DocumentsApi = ReturnType<typeof useDocuments>;
/** useProject가 돌려주는 작품 정보 + 갱신 액션 묶음. */
export type ProjectApi = ReturnType<typeof useProject>;
