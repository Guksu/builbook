// 백업 파일 입출력 — 브라우저 DOM/File API를 만지는 유일한 지점.
// 순수 변환(backup.ts)과 분리해 두면 변환 로직을 node 환경에서 그대로 테스트할 수 있다.

export function downloadJsonFile(baseName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    reader.readAsText(file);
  });
}
