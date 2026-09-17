"use client";

import { Button, Modal } from "@shared/ui";
import { useModLabel, type ModLabel } from "../lib/platform";

export interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

// 실제로 동작하는 것만 적는다 — 안내에만 있고 눌리지 않는 키는 신뢰를 깎는다.
function rows(mod: ModLabel): { keys: string; what: string }[] {
  return [
    { keys: `${mod}+B`, what: "굵게" },
    { keys: `${mod}+I`, what: "기울임" },
    { keys: `${mod}+Shift+S`, what: "취소선" },
    { keys: `${mod}+Shift+B`, what: "인용" },
    { keys: `${mod}+Z`, what: "되돌리기" },
    { keys: `${mod}+Shift+Z`, what: "다시하기" },
    { keys: `${mod}+F`, what: "찾기·바꾸기 (본문에 커서가 있을 때)" },
    { keys: "Esc", what: "찾기 닫기" },
    { keys: "F2", what: "제목 편집 (제목을 눌러도 됩니다)" },
    { keys: `${mod}+P`, what: "빠른 열기 (문서 이름으로 이동)" },
    { keys: "Alt+S", what: "진행 상태 바꾸기 (초고 → 퇴고 → 완료)" },
    { keys: `${mod}+Shift+1~7`, what: "패널 열고 닫기 (연표·현황·점검·검색·리서치·휴지통·영감)" },
    { keys: `${mod}+Shift+8`, what: "인스펙터 열고 닫기" },
    { keys: "# + 공백", what: "제목 줄로 바꾸기" },
    { keys: "> + 공백", what: "인용 줄로 바꾸기" },
  ];
}

/** 단축키 안내 — 툴바 끝 "?"로 연다. 외울 필요는 없고, 필요할 때 열어보면 된다. */
export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const mod = useModLabel();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="단축키"
      description="저장은 자동입니다. 아래만 알아도 충분해요."
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <table className="w-full border-collapse text-body-sm">
        <caption className="sr-only">에디터 단축키 목록</caption>
        <tbody>
          {rows(mod).map((r) => (
            <tr key={r.keys} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="w-[140px] py-6 pr-12 text-left font-medium text-fg"
              >
                <kbd className="rounded-sm border border-border bg-surface px-6 py-2 text-caption tabular-nums">
                  {r.keys}
                </kbd>
              </th>
              <td className="py-6 text-fg-weak">{r.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
