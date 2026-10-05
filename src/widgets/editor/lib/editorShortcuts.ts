"use client";

// 에디터 전용 키맵. Tiptap 확장으로 등록하므로 **본문에 커서가 있을 때만** 동작한다 —
// 브라우저 기본 찾기(Ctrl+F)를 앱 전역에서 뺏으면 작가가 페이지 전체를 못 찾게 된다.
//
// 목록 단축키(⌘/Ctrl+Shift+7·8)는 끈다. 작업실 패널 단축키(⌘/Ctrl+Shift+숫자)와 같은 키라서
// 본문에 커서가 있을 때 패널을 열면 문단이 목록으로 바뀌었다(2026-10 확인). 툴바에 목록 버튼이
// 원래 없고, 줄 앞에 '- '·'1. '를 치면 목록이 되는 입력 규칙은 그대로 남는다.

import { Extension } from "@tiptap/react";

export interface EditorShortcutOptions {
  onFind: () => void;
}

export const EditorShortcuts = Extension.create<EditorShortcutOptions>({
  name: "builbookShortcuts",
  // 기본 확장(StarterKit 목록 등)보다 먼저 키를 받아야 목록 단축키를 가로챌 수 있다.
  priority: 1000,

  addOptions() {
    return { onFind: () => {} };
  },

  addKeyboardShortcuts() {
    return {
      // true를 돌려주면 ProseMirror가 preventDefault까지 해준다(브라우저 찾기 창이 안 뜬다).
      "Mod-f": () => {
        this.options.onFind();
        return true;
      },
      // true = "처리함" — 목록으로 바꾸지 않는다. 패널 토글은 window 리스너가 따로 받는다.
      "Mod-Shift-7": () => true,
      "Mod-Shift-8": () => true,
    };
  },
});
