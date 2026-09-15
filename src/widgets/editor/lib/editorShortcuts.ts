"use client";

// 에디터 전용 키맵. Tiptap 확장으로 등록하므로 **본문에 커서가 있을 때만** 동작한다 —
// 브라우저 기본 찾기(Ctrl+F)를 앱 전역에서 뺏으면 작가가 페이지 전체를 못 찾게 된다.

import { Extension } from "@tiptap/react";

export interface EditorShortcutOptions {
  onFind: () => void;
}

export const EditorShortcuts = Extension.create<EditorShortcutOptions>({
  name: "builbookShortcuts",

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
    };
  },
});
