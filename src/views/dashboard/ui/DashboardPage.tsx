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
import { seedFirstEpisode } from "@entities/document";
import { ThemeToggle } from "@features/toggle-theme";
import { BackupModal, BackupReminder } from "@features/backup-restore";
import { StorageNotice } from "@features/storage-guard";

export function DashboardPage() {
  const { projects, isLoading, error, createProject, deleteProject, renameProject } =
    useProjects();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [backupOpen, setBackupOpen] = useState(false);
  // 동기 in-flight 가드: 상태 업데이트(setBusy)는 비동기라 연속 호출(한글 IME의
  // Enter 더블 fire, 빠른 더블클릭)을 막지 못한다. ref로 즉시 차단해 중복 생성 방지.
  const creatingRef = useRef(false);
  const renamingRef = useRef(false); // 제목 변경도 같은 이유로 중복 저장을 막는다

  function openRename(p: Project) {
    setRenameTarget(p);
    setRenameDraft(p.title);
  }

  async function handleRename() {
    if (!renameTarget || renamingRef.current || !renameDraft.trim()) return;
    renamingRef.current = true;
    try {
      await renameProject(renameTarget.id, renameDraft);
      setRenameTarget(null);
    } catch {
      toast("제목을 바꾸지 못했어요.", "error");
    } finally {
      renamingRef.current = false;
    }
  }

  async function handleCreate() {
    if (creatingRef.current || !title.trim()) return;
    creatingRef.current = true;
    setBusy(true);
    try {
      const project = await createProject({ title: title.trim() });
      if (!project) return;
      // 빈 바인더 대신 "1화"를 미리 만들어 둔다 — 들어가자마자 쓸 수 있게.
      await seedFirstEpisode(project.id);
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
          <Button variant="secondary" onClick={() => setBackupOpen(true)}>
            백업
          </Button>
          <Button onClick={() => setOpen(true)}>+ 새 작품</Button>
        </div>
      </header>

      {/* 백업 권유 배너 — 백업한 적 없거나 7일 이상 지났을 때만 나타난다 */}
      <BackupReminder
        projectCount={projects.length}
        onOpenBackup={() => setBackupOpen(true)}
      />
      {/* 저장 공간 보호 요청 + 사용량 — 로컬 저장 앱의 생명줄이라 목록 위에 늘 한 줄 둔다 */}
      <StorageNotice className="mb-16" />

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
              {/* 카드 동작 — 평소엔 숨기고 마우스를 올리거나 키보드로 들어오면 보인다 */}
              <div className="absolute right-8 top-8 flex items-center gap-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  aria-label="작품 제목 바꾸기"
                  title="제목 바꾸기"
                  className="text-fg-weak hover:text-fg"
                  onClick={(e) => {
                    e.stopPropagation(); // 카드 네비게이션 막기
                    openRename(p);
                  }}
                >
                  <IconPencil />
                </button>
                <button
                  type="button"
                  aria-label="작품 삭제"
                  className="text-fg-weak hover:text-error"
                  onClick={(e) => {
                    e.stopPropagation(); // 카드 네비게이션 막기
                    setDeleteTarget(p);
                  }}
                >
                  ✕
                </button>
              </div>
              {/* 오른쪽 여백 — 긴 제목이 연필·✕ 버튼 밑으로 겹치지 않게 */}
              <CardHeader className="pr-40">
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

      {/* 카드 밖에 둔다 — 포털이어도 React 이벤트는 부모로 번지므로 카드 안이면 클릭이 작업실 이동이 된다 */}
      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="작품 제목 바꾸기"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              취소
            </Button>
            <Button onClick={handleRename} disabled={!renameDraft.trim()}>
              저장
            </Button>
          </>
        }
      >
        <label className="mb-6 block text-body-sm text-fg-weak" htmlFor="rename-title">
          작품 제목
        </label>
        <Input
          id="rename-title"
          autoFocus
          value={renameDraft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            // 한글 등 IME 조합 중 Enter는 '조합 확정'이므로 무시(중복 제출 방지).
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleRename();
          }}
        />
      </Modal>

      <BackupModal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        projectCount={projects.length}
      />

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

function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1L5.6 12.2 2.5 13l.8-3.1 8-7.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
