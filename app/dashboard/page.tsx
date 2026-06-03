"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Modal,
  useToast,
} from "@/components/ui";
import { useProjects } from "@/hooks/useProjects";

export default function DashboardPage() {
  const { projects, isLoading, error, createProject } = useProjects();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const project = await createProject({ title: title.trim() });
      setOpen(false);
      setTitle("");
      router.push(`/projects/${project.id}`);
    } catch {
      toast("작품 생성에 실패했어요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[960px] px-24 py-32">
      <header className="mb-24 flex items-center justify-between">
        <h1 className="text-h1 text-fg">내 작품</h1>
        <Button onClick={() => setOpen(true)}>+ 새 작품</Button>
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
            >
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
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
      </Modal>
    </main>
  );
}
