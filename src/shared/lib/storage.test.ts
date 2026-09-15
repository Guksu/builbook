import { beforeEach, describe, expect, it } from "vitest";
import { isOneOf, readJson, writeJson } from "./storage";

// node 환경 — 최소 localStorage 흉내
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

const isNum = (v: unknown): v is number => typeof v === "number";

describe("readJson / writeJson", () => {
  it("왕복", () => {
    writeJson("k", 3);
    expect(readJson("k", isNum, 0)).toBe(3);
  });
  it("없거나 깨졌거나 guard에 안 맞으면 fallback", () => {
    expect(readJson("none", isNum, 7)).toBe(7);
    store.set("bad", "{not json");
    expect(readJson("bad", isNum, 7)).toBe(7);
    store.set("str", JSON.stringify("x"));
    expect(readJson("str", isNum, 7)).toBe(7);
  });
  it("setItem이 던져도 조용히 넘어간다", () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage.setItem = () => {
      throw new Error("quota");
    };
    expect(() => writeJson("k", 1)).not.toThrow();
  });
});

describe("isOneOf", () => {
  it("열거값만 통과", () => {
    const g = isOneOf(["a", "b"] as const);
    expect(g("a")).toBe(true);
    expect(g("c")).toBe(false);
    expect(g(1)).toBe(false);
  });
});
