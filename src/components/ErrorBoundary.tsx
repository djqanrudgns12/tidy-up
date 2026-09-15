import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="app-shell profile-card">
          <h1>화면을 다시 불러와 주세요</h1>
          <p>
            화면을 준비하는 중에 문제가 생겼어요. 다시 불러온 뒤 ‘이어하기’가
            보이면 눌러 주세요.
          </p>
          <button
            className="button primary-action"
            onClick={() => location.reload()}
          >
            화면 다시 불러오기
          </button>
        </main>
      );
    return this.props.children;
  }
}
