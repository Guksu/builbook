// 브라우저 파일 다운로드 헬퍼 — 백엔드가 없으므로 Blob + a[download]로 저장.
// 부수효과(DOM)를 다루는 유일한 지점이라 순수 변환 로직(exportDocuments)과 분리한다.

export type ExportFormat = "txt" | "md" | "docx";

const MIME: Record<ExportFormat, string> = {
  txt: "text/plain",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Blob 하나를 파일로 저장. 객체 URL은 클릭이 처리된 뒤에 해제한다(즉시 해제하면 일부
// 브라우저가 다운로드를 놓친다).
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextFile(
  baseName: string,
  format: ExportFormat,
  content: string,
): void {
  const blob = new Blob([content], { type: `${MIME[format]};charset=utf-8` });
  downloadBlob(`${baseName}.${format}`, blob);
}
