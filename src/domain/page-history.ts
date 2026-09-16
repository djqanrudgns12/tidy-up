import type { Session, Step } from "./session";

export type PageHistory = {
  entries: Session[];
  index: number;
};

const pageLabels: Record<Step, string> = {
  landing: "첫 화면",
  profile: "활동 준비",
  tutorial: "정리 비법",
  maps: "공간 선택",
  setup: "물건 선택",
  organize: "정리 정돈",
  clean: "청소",
  quiz: "마무리 퀴즈",
  result: "활동 결과",
  end: "활동 완료",
};

export function createPageHistory(session: Session): PageHistory {
  return { entries: [session], index: 0 };
}

function isSamePage(a: Session, b: Session) {
  return a.step === b.step && a.mapId === b.mapId;
}

/** Record only completed screen transitions; changes made within a screen replace its snapshot. */
export function recordPage(history: PageHistory, session: Session): PageHistory {
  if (session.step === "landing" || session.step === "end")
    return createPageHistory(session);

  const current = history.entries[history.index];
  if (!current) return createPageHistory(session);

  const entries = history.entries.slice(0, history.index + 1);
  if (isSamePage(current, session)) entries[history.index] = session;
  else entries.push(session);

  return { entries, index: entries.length - 1 };
}

/** Refresh a restored snapshot without deleting the still-available forward pages. */
export function replaceCurrentPage(
  history: PageHistory,
  session: Session,
): PageHistory {
  const entries = [...history.entries];
  entries[history.index] = session;
  return { ...history, entries };
}

export function pageAtOffset(history: PageHistory, offset: -1 | 1) {
  const index = history.index + offset;
  const session = history.entries[index];
  return session ? { index, session } : null;
}

export function pageLabel(session: Session | undefined) {
  return session ? pageLabels[session.step] : "";
}
