import { useEffect, useRef, useState, type ReactNode } from "react";
import { categories, eisenhower, quiz, tutorialPool } from "../data/lesson";
import "./QuestionCards.css";

function shuffle<T>(list: readonly T[]) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
// 마지막 글자에 받침이 있으면 "이에요", 없으면 "예요".
function copula(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 ? "이에요" : "예요";
}
// 분류마다 상황 하나씩 고르고 순서를 섞어, 정답이 1→2→3→4로 이어지지 않게 한다.
function pickTutorial() {
  return shuffle(
    categories.map((_, category) =>
      shuffle(tutorialPool.filter((card) => card.answer === category))[0],
    ),
  );
}

const icons: Record<(typeof categories)[number]["icon"], ReactNode> = {
  discard: (
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
  ),
  help: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M16 11a2.5 2.5 0 1 0 0-5M17.5 14c1.7.6 2.8 2.4 3 5" />
  ),
  now: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  later: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2" />
  ),
};
function CategoryIcon({ icon }: { icon: keyof typeof icons }) {
  return (
    <span className={`qc-icon qc-icon-${icon}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {icons[icon]}
      </svg>
    </span>
  );
}

function Progress({
  label,
  index,
  total,
}: {
  label: string;
  index: number;
  total: number;
}) {
  return (
    <div className="qc-kicker">
      <span>{label}</span>
      {index >= 0 && (
        <span
          className="qc-progress"
          role="img"
          aria-label={`${total}개 중 ${index + 1}번째`}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={i < index ? "done" : i === index ? "current" : ""}
            />
          ))}
          <b>
            {index + 1} / {total}
          </b>
        </span>
      )}
    </div>
  );
}

export function QuestionCards({
  kind,
  onDone,
}: {
  kind: "tutorial" | "quiz";
  onDone: () => void;
}) {
  const isTutorial = kind === "tutorial";
  const [tutorialCards] = useState(pickTutorial);
  const [optionOrders] = useState(() =>
    quiz.map((q) => shuffle(q.options.map((_, i) => i))),
  );
  // 튜토리얼은 -1(아이젠하워 법칙 설명)부터 시작한다.
  const [index, setIndex] = useState(isTutorial ? -1 : 0);
  const [tried, setTried] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const total = isTutorial ? tutorialCards.length : quiz.length;
  const last = index + 1 === total;
  const correctIndex = isTutorial
    ? tutorialCards[index]?.answer
    : quiz[index]?.answer;
  const solved = answer !== null && answer === correctIndex;
  const canContinue = isTutorial ? solved : answer !== null;

  useEffect(() => {
    heading.current?.focus();
  }, [index, kind]);
  useEffect(() => {
    if (answer !== null) feedback.current?.focus();
  }, [answer, tried.length]);

  const next = () => {
    if (last) onDone();
    else {
      setIndex(index + 1);
      setAnswer(null);
      setTried([]);
    }
  };
  const nextButton = canContinue && (
    <div className="qc-next">
      <button className="button" onClick={next}>
        {last
          ? isTutorial
            ? "공간 선택하기"
            : "결과 이미지 보기"
          : isTutorial
            ? "다음 상황"
            : "다음 문제"}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );

  if (isTutorial && index < 0)
    return (
      <section className="question-card panel">
        <Progress label="아이젠하워 법칙" index={-1} total={total} />
        <h1 ref={heading} tabIndex={-1}>
          정리 잘하는 비법, 아이젠하워 법칙
        </h1>
        <div className="qc-story">
          {eisenhower.story.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <h2 className="qc-subheading">이렇게 정리해요</h2>
        <ol className="qc-steps">
          {eisenhower.steps.map((step, i) => (
            <li key={step.title}>
              <span className="qc-step-number">{i + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </span>
            </li>
          ))}
        </ol>
        <h2 className="qc-subheading">네 칸의 이름</h2>
        <ul className="qc-board qc-board-legend">
          {categories.map((category) => (
            <li className="qc-tile" key={category.label}>
              <CategoryIcon icon={category.icon} />
              <span>
                <strong>{category.label}</strong>
                <small>{category.hint}</small>
              </span>
            </li>
          ))}
        </ul>
        <p className="qc-closing">{eisenhower.closing}</p>
        <p className="qc-source">{eisenhower.source}</p>
        <div className="qc-next">
          <button className="button" onClick={() => setIndex(0)}>
            상황 카드로 연습하기 <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    );

  if (isTutorial) {
    const card = tutorialCards[index];
    const wrong = answer !== null && !solved ? categories[answer] : null;
    return (
      <section className="question-card panel">
        <Progress label="아이젠하워 법칙" index={index} total={total} />
        <h1 ref={heading} tabIndex={-1}>
          어느 칸에 놓을까요?
        </h1>
        <p className="qc-intro">상황을 읽고 알맞은 칸을 눌러 주세요.</p>
        <div className="qc-question">{card.story}</div>
        <div className="qc-board">
          {categories.map((category, i) => {
            const state = solved && i === answer
              ? "correct"
              : tried.includes(i)
                ? "wrong"
                : "";
            return (
              <button
                key={category.label}
                className={`qc-tile ${state}`}
                disabled={solved || tried.includes(i)}
                onClick={() => {
                  setAnswer(i);
                  if (i !== card.answer) setTried([...tried, i]);
                }}
              >
                <CategoryIcon icon={category.icon} />
                <span>
                  <strong>{category.label}</strong>
                  <small>{category.hint}</small>
                </span>
                {state && (
                  <span className="qc-mark" aria-label={state === "correct" ? "정답" : "오답"}>
                    {state === "correct" ? "✓" : "✕"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {answer !== null && (
          <div
            className={`qc-feedback ${solved ? "correct" : "wrong"}`}
            role="status"
            ref={feedback}
            tabIndex={-1}
          >
            {solved ? (
              <>
                <strong>정답이에요! ‘{categories[answer].label}’ 칸이에요.</strong>
                <p>{card.explanation}</p>
              </>
            ) : (
              <>
                <strong>다시 생각해 볼까요?</strong>
                <p>
                  ‘{wrong!.label}’은 {wrong!.hint}
                  {copula(wrong!.hint)}. {card.hint}
                </p>
              </>
            )}
          </div>
        )}
        {solved && last && (
          <p className="small-note">
            물건을 어떻게 처리할지 나누면 정리를 시작하기 쉬워요.
          </p>
        )}
        {nextButton}
      </section>
    );
  }

  const question = quiz[index];
  return (
    <section className="question-card panel">
      <Progress label="마무리 퀴즈" index={index} total={total} />
      <h1 ref={heading} tabIndex={-1}>
        {question.title}
      </h1>
      <p className="qc-intro">정리 정돈과 청소 방법을 확인해요.</p>
      <div className="qc-question">{question.question}</div>
      <div className="qc-options">
        {optionOrders[index].map((i) => {
          const state =
            answer === null
              ? ""
              : i === question.answer
                ? "correct"
                : i === answer
                  ? "wrong"
                  : "rest";
          return (
            <button
              key={i}
              className={`qc-option ${state}`}
              disabled={answer !== null}
              onClick={() => setAnswer(i)}
            >
              <span className="qc-radio" aria-hidden="true">
                {state === "correct" ? "✓" : state === "wrong" ? "✕" : ""}
              </span>
              <span>{question.options[i]}</span>
            </button>
          );
        })}
      </div>
      {answer !== null && (
        <div
          className={`qc-feedback ${solved ? "correct" : "wrong"}`}
          role="status"
          ref={feedback}
          tabIndex={-1}
        >
          <strong>
            {solved
              ? "정답이에요!"
              : `아쉬워요. 정답은 ‘${question.options[question.answer]}’${copula(question.options[question.answer])}.`}
          </strong>
          <p>{question.explanation}</p>
          {question.ordered ? (
            <ol className="qc-points ordered">
              {question.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          ) : (
            <ul className="qc-points">
              {question.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
          <small className="qc-source">{question.source}</small>
        </div>
      )}
      {nextButton}
    </section>
  );
}
