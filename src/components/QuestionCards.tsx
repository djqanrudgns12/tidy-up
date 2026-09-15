import { useEffect, useRef, useState } from "react";
import { categories, quiz, tutorial } from "../data/lesson";
export function QuestionCards({
  kind,
  onDone,
}: {
  kind: "tutorial" | "quiz";
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState<number | null>(null);
  const isTutorial = kind === "tutorial",
    cards = isTutorial ? tutorial : quiz,
    card = cards[index];
  const question = "story" in card ? card.story : card.question;
  const options = "options" in card ? card.options : categories;
  const correct = answer === card.answer,
    canContinue = answer !== null && (!isTutorial || correct);
  const heading = useRef<HTMLHeadingElement>(null);
  const explanation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [index, kind]);
  useEffect(() => {
    if (canContinue) explanation.current?.focus();
  }, [canContinue]);
  return (
    <section className="question-card panel">
      <div className="card-kicker">
        <span>{isTutorial ? "아이젠하워 법칙" : "마무리 퀴즈"}</span>
        <span>
          {index + 1} / {cards.length}
        </span>
      </div>
      <h1 ref={heading} tabIndex={-1}>
        {isTutorial ? "먼저 할 일을 나눠 볼까요?" : quiz[index].title}
      </h1>
      <p className="intro-text">
        {isTutorial
          ? "상황을 읽고 알맞은 분류를 눌러 주세요."
          : "정리 정돈과 청소 방법을 확인해요."}
      </p>
      <div className="question-text">{question}</div>
      <div className="answers">
        {options.map((option, i) => (
          <button
            key={option}
            className={`answer ${answer === i ? "chosen" : ""} ${answer !== null && card.answer === i ? "correct" : ""}`}
            disabled={canContinue}
            onClick={() => setAnswer(i)}
          >
            <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
            <span>{option}</span>
          </button>
        ))}
      </div>
      {answer !== null && (
        <div
          className="answer-explanation"
          role="status"
          ref={explanation}
          tabIndex={-1}
        >
          <strong>{correct ? "정답" : "설명을 확인해 주세요."}</strong>
          <p>{card.explanation}</p>
          {isTutorial && !correct && <p>설명을 읽고 다시 골라 주세요.</p>}
        </div>
      )}
      {canContinue && (
        <div className="question-next">
          <button
            className="button"
            onClick={() => {
              if (index + 1 === cards.length) onDone();
              else {
                setIndex(index + 1);
                setAnswer(null);
              }
            }}
          >
            {index + 1 === cards.length
              ? isTutorial
                ? "공간 선택하기"
                : "결과 이미지 보기"
              : "다음"}
          </button>
        </div>
      )}
      {isTutorial && index === 3 && correct && (
        <p className="small-note">
          물건을 어떻게 처리할지 나누면 정리를 시작하기 쉬워요.
        </p>
      )}
    </section>
  );
}
