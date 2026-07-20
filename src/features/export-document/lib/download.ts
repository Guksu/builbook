// 브라우저 파일 다운로드 헬퍼 — 백엔드가 없으므로 Blob + a[download]로 저장.
// 부수효과(DOM)를 다루는 유일한 지점이라 순수 변환 로직(exportDocuments)과 분리한다.

export type ExportFormat = "txt" | "md";

const MIME: Record<ExportFormat, string> = {
  txt: "text/plain",
  md: "text/markdown",
};

export function downloadTextFile(
  baseName: string,
  format: ExportFormat,
  content: string,
): void {
  const blob = new Blob([content], { type: `${MIME[format]};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
