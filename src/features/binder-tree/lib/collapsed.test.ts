import { describe, expect, it } from "vitest";
import {
  collapsedStorageKey,
  parseCollapsed,
  serializeCollapsed,
} from "./collapsed";

describe("collapsedStorageKey", () => {
  it("작품별로 키가 갈린다", () => {
    expect(collapsedStorageKey("p1")).toBe("builbook:binder-collapsed:p1");
    expect(collapsedStorageKey("p1")).not.toBe(collapsedStorageKey("p2"));
  });
});

describe("serialize/parseCollapsed", () => {
  it("왕복해도 같은 집합", () => {
    const set = new Set(["a", "b"]);
    expect([...parseCollapsed(serializeCollapsed(set))].sort()).toEqual(["a", "b"]);
  });

  it("값이 없으면 빈 집합(= 다 펼침)", () => {
    expect(parseCollapsed(null).size).toBe(0);
    expect(parseCollapsed("").size).toBe(0);
  });

  it("깨진 값이어도 빈 집합으로 회복한다", () => {
    expect(parseCollapsed("{nope").size).toBe(0);
    expect(parseCollapsed('{"a":1}').size).toBe(0);
  });

  it("문자열이 아닌 원소는 버린다", () => {
    expect([...parseCollapsed('["a",1,null,"b"]')]).toEqual(["a", "b"]);
  });
});
