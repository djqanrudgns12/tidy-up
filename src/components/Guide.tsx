import type { ReactNode } from "react";

// 핵심어 색은 뜻마다 고정한다. 같은 말은 어느 화면에서나 같은 색으로 보인다.
// sort: 나누기·개수  space: 공간·자리·정리  clean: 청소·먼지·도구  result: 결과·저장·퀴즈
export type KeyTone = "sort" | "space" | "clean" | "result";

export function Key({ tone, children }: { tone: KeyTone; children: ReactNode }) {
  return <mark className={`key key--${tone}`}>{children}</mark>;
}

// 화면이 넘어가기 전에 다음에 할 일을 한 줄로 알려 준다.
export function NextStep({
  label = "다음에는",
  compact = false,
  children,
}: {
  label?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`next-step${compact ? " next-step--compact" : ""}`}>
      <span className="next-step-badge">{label}</span>
      <p>{children}</p>
    </div>
  );
}
