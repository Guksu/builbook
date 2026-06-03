"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  ConfirmModal,
  Input,
  Modal,
  useToast,
} from "@shared/ui";
import { useProjects, type Project } from "@entities/project";
import { ThemeToggle } from "@features/toggle-theme";

export function DashboardPage() {
  const { projects, isLoading, error, createProject, deleteProject } =
    useProjects();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  // 동기 in-flight 가드: 상태 업데이트(setBusy)는 비동기라 연속 호출(한글 IME의
  // Enter 더블 fire, 빠른 더블클릭)을 막지 못한다. ref로 즉시 차단해 중복 생성 방지.
  const creatingRef = useRef(false);

  async function handleCreate() {
    if (creatingRef.current || !title.trim()) return;
    creatingRef.current = true;
    setBusy(true);
    try {
      const project = await createProject({ title: title.trim() });
      if (!project) return;
      setOpen(false);
      setTitle("");
      router.push(`/projects/${project.id}`);
    } catch {
      toast("작품 생성에 실패했어요.", "error");
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[960px] px-24 py-32">
      <header className="mb-24 flex items-center justify-between">
        <h1 className="text-h1 text-fg">내 작품</h1>
        <div className="flex items-center gap-8">
          <ThemeToggle />
          <Button onClick={() => setOpen(true)}>+ 새 작품</Button>
        </div>
      </header>

      {isLoading && <p className="text-body text-fg-weak">불러오는 중…</p>}
      {error && <p className="text-body text-error">목록을 불러오지 못했어요.</p>}

      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center gap-16 rounded-xl border border-border bg-surface px-24 py-56 text-center">
          <p className="text-body-lg text-fg-weak">아직 작품이 없어요.</p>
          <Button size="lg" onClick={() => setOpen(true)}>
            첫 작품 만들기
          </Button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              interactive
              onClick={() => router.push(`/projects/${p.id}`)}
              className="group relative"
            >
              <button
                type="button"
                aria-label="작품 삭제"
                className="absolute right-8 top-8 opacity-0 transition-opacity group-hover:opacity-100 text-fg-weak hover:text-error"
                onClick={(e) => {
                  e.stopPropagation(); // 카드 네비게이션 막기
                  setDeleteTarget(p);
                }}
              >
                ✕
              </button>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
                <CardDescription>
                  {new Date(p.updatedAt).toLocaleDateString("ko-KR")} 수정
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="새 작품 만들기"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={busy || !title.trim()}>
              만들기
            </Button>
          </>
        }
      >
        <label className="mb-6 block text-body-sm text-fg-weak" htmlFor="title">
          작품 제목
        </label>
        <Input
          id="title"
          autoFocus
          placeholder="예) 회귀한 검사는 멈추지 않는다"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // 한글 등 IME 조합 중 Enter는 '조합 확정'이므로 무시(중복 제출 방지).
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate();
          }}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.title}' 삭제`}
        description="작품과 그 안의 모든 문서가 삭제됩니다. 되돌릴 수 없습니다."
        danger
        confirmText="삭제"
      />
    </main>
  );
}
