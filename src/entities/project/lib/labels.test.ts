import { describe, expect, it } from "vitest";
import {
  DEFAULT_LABELS,
  LABEL_COLORS,
  LABEL_COLOR_CLASS,
  LABEL_COLOR_LABEL,
  addLabel,
  findLabel,
  isLabelColor,
  removeLabel,
  renameLabel,
  withDefaultLabels,
  type ProjectLabel,
} from "./labels";

const base: ProjectLabel[] = [
  { id: "l1", name: "복선", color: "purple" },
  { id: "l2", name: "수정 필요", color: "orange" },
];

describe("팔레트", () => {
  it("모든 색 키에 한국어 이름과 Tailwind 클래스가 있다", () => {
    for (const color of LABEL_COLORS) {
      expect(LABEL_COLOR_LABEL[color]).toBeTruthy();
      expect(LABEL_COLOR_CLASS[color]).toBe(`bg-label-${color}`);
    }
  });

  it("팔레트에 없는 값은 색으로 보지 않는다", () => {
    expect(isLabelColor("blue")).toBe(true);
    expect(isLabelColor("teal")).toBe(false);
    expect(isLabelColor(undefined)).toBe(false);
  });
});

describe("기본 라벨", () => {
  it("한 번도 안 건드린 작품(undefined)은 기본 목록을 쓴다", () => {
    expect(withDefaultLabels(undefined)).toEqual([...DEFAULT_LABELS]);
  });

  it("빈 배열은 '다 지웠다'는 뜻이라 기본 목록으로 되돌리지 않는다", () => {
    expect(withDefaultLabels([])).toEqual([]);
  });

  it("저장된 목록은 그대로 쓰되 원본 배열을 공유하지 않는다", () => {
    const result = withDefaultLabels(base);
    expect(result).toEqual(base);
    expect(result).not.toBe(base);
  });
});

describe("추가", () => {
  it("이름을 다듬어 맨 뒤에 붙인다", () => {
    const next = addLabel(base, { name: "  회상  ", color: "green", id: "l3" });
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ id: "l3", name: "회상", color: "green" });
    expect(base).toHaveLength(2); // 원본 불변
  });

  it("빈 이름은 추가하지 않는다", () => {
    expect(addLabel(base, { name: "   ", color: "red" })).toEqual(base);
  });

  it("id를 주지 않으면 스스로 만든다", () => {
    const next = addLabel([], { name: "새 라벨", color: "blue" });
    expect(next[0].id).toBeTruthy();
  });
});

describe("이름·색 변경", () => {
  it("이름만 바꾼다", () => {
    const next = renameLabel(base, "l1", { name: " 떡밥 " });
    expect(findLabel(next, "l1")).toEqual({ id: "l1", name: "떡밥", color: "purple" });
  });

  it("색만 바꾼다", () => {
    const next = renameLabel(base, "l2", { color: "red" });
    expect(findLabel(next, "l2")?.color).toBe("red");
    expect(findLabel(next, "l2")?.name).toBe("수정 필요");
  });

  it("빈 이름은 무시하고 기존 이름을 지킨다", () => {
    const next = renameLabel(base, "l1", { name: "  " });
    expect(findLabel(next, "l1")?.name).toBe("복선");
  });

  it("없는 id면 아무것도 바뀌지 않는다", () => {
    expect(renameLabel(base, "없음", { name: "x" })).toEqual(base);
  });
});

describe("삭제·조회", () => {
  it("해당 라벨만 빠진다", () => {
    expect(removeLabel(base, "l1").map((l) => l.id)).toEqual(["l2"]);
  });

  it("찾기: 없는 id·빈 값은 null", () => {
    expect(findLabel(base, "l2")?.name).toBe("수정 필요");
    expect(findLabel(base, "지워진라벨")).toBeNull();
    expect(findLabel(base, null)).toBeNull();
    expect(findLabel(undefined, "l1")).toBeNull();
  });
});
