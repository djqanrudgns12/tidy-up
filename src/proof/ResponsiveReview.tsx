import { useState } from "react";

const sizes = [
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [844, 390],
];
export function ResponsiveReview() {
  const [[width, height], setSize] = useState(sizes[3]);
  return (
    <main className="responsive-review">
      <h1>화면 크기 검수</h1>
      <p>
        실제 CSS 뷰포트 크기를 갖는 개발용 프레임입니다. 터치·기기 저장 검수는
        별도로 진행합니다.
      </p>
      <div className="row-actions">
        {sizes.map((size) => (
          <button
            className="button secondary"
            key={size.join("x")}
            onClick={() => setSize(size)}
          >
            {size[0]} × {size[1]}
          </button>
        ))}
      </div>
      <p>
        {width} × {height}
      </p>
      <iframe
        title="활동 화면 검수"
        src="./?frame"
        style={{
          width,
          height,
          maxWidth: "none",
          border: "1px solid #9caa98",
          display: "block",
        }}
      />
    </main>
  );
}
