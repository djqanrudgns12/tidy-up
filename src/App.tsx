import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { mapsById } from "./data/maps";
import { assetsById } from "./data/catalog";
import { characters, quiz, tools } from "./data/lesson";
import { physicalMaps } from "./data/physical";
import {
  activeItems,
  availableTool,
  initialPlacements,
  initialSignature,
  makeSession,
  reducer,
  tryPlacement,
  toggleExtra,
  validName,
  type Action,
  type Session,
  type Tool,
} from "./domain/session";
import { readSaved, saveSession, storageKey } from "./domain/storage";
import { poseOf } from "./domain/placement";
import type { ArtCollection, Point } from "./domain/types";
import {
  assetUrl,
  loadSceneItem,
  loadImage,
  loadSceneArt,
  retainArtCache,
  sceneArtPaths,
} from "./rendering/art";
const Scene = lazy(() =>
  import("./components/Scene").then((module) => ({ default: module.Scene })),
);
import { QuestionCards } from "./components/QuestionCards";
import { Key, NextStep } from "./components/Guide";
import { MapSelection } from "./components/MapSelection";
import { ConfirmDialog, type Confirmation } from "./components/ConfirmDialog";
import { ResultImageDialog } from "./components/ResultImageDialog";

function safeRead() {
  try {
    return readSaved(localStorage, location.href);
  } catch {
    return {
      notice:
        "이 기기에서는 이어하기를 저장할 수 없어요. 새로고침하지 말고 활동을 마쳐 주세요.",
    };
  }
}
export function App() {
  const [saved, setSaved] = useState(safeRead);
  const [state, dispatch] = useReducer(
    (s: Session, a: Action | { type: "RESTORE"; session: Session }) =>
      a.type === "RESTORE"
        ? { ...a.session, updatedAt: Date.now() }
        : reducer(s, a),
    undefined,
    makeSession,
  );
  const [name, setName] = useState(""),
    [character, setCharacter] = useState(""),
    composing = useRef(false);
  const [notice, setNotice] = useState(saved.notice ?? ""),
    [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [selected, setSelected] = useState(""),
    [placing, setPlacing] = useState(false),
    [highlight, setHighlight] = useState("");
  const [tool, setTool] = useState<Tool | null>(null),
    [art, setArt] = useState<{ key: string; value: ArtCollection }>();
  const [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [candidateFailures, setCandidateFailures] = useState<string[]>([]);
  const candidateRetryFocus = useRef<{ key: string; id: string } | null>(null);
  const [result, setResult] = useState<{ url: string; bytes: number }>(),
    [resultError, setResultError] = useState("");
  const [resultPreviewOpen, setResultPreviewOpen] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const map = state.mapId ? mapsById[state.mapId] : null,
    geometry = state.mapId ? physicalMaps[state.mapId] : null;
  const items = map ? activeItems(map.id, state.extras) : [];
  const key = map ? `${map.id}:${map.revision}` : "";
  const sceneArt = art?.key === key ? art.value : undefined;
  const activity = ["setup", "organize", "clean"].includes(state.step);
  const chosen = items.find((item) => item.id === selected);
  const selectedPlacement = selected ? state.placements[selected] : undefined;
  const selectedSurface = selectedPlacement
    ? geometry?.surfaces.find((surface) => surface.id === selectedPlacement.surface)
    : undefined;
  const selectedCanRotate = Boolean(
    chosen &&
      map &&
      selectedSurface &&
      poseOf(assetsById[chosen.asset], selectedSurface, map.id) === "flat",
  );
  const workingPlacements =
    state.step === "setup" && map
      ? initialPlacements(map.id, state.extras)
      : state.placements;
  const model =
    map &&
    geometry &&
    sceneArt &&
    items.every((item) => sceneArt.items[item.asset])
      ? {
          mapId: map.id,
          geometry,
          items,
          placements: workingPlacements,
          art: sceneArt,
          selected,
          highlight,
          showDirt: state.step === "clean",
          cleanTool: state.step === "clean" ? tool ?? undefined : undefined,
          clean: state.cleaned.map(String),
        }
      : null;

  useEffect(() => {
    try {
      saveSession(localStorage, location.href, state);
    } catch {
      setNotice(
        state.step === "end"
          ? "이 브라우저에 저장된 활동을 지우지 못했어요. 선생님께 알려 주세요."
          : "이 기기에서는 이어하기를 저장할 수 없어요. 새로고침하지 말고 활동을 마쳐 주세요.",
      );
    }
  }, [state]);
  useEffect(() => {
    setMessage("");
    setSelected("");
    setPlacing(false);
    setHighlight("");
    setTool(null);
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>("h1")?.focus();
  }, [state.step, state.mapId]);
  useEffect(() => {
    setArt(undefined);
    setCandidateFailures([]);
    candidateRetryFocus.current = null;
    retainArtCache(
      map
        ? [
            ...sceneArtPaths(
              map.id,
              [...map.base, ...map.extras].map((item) => item.asset),
            ),
            `assets/characters/${state.character}.webp`,
            ...tools.map((tool) => `assets/tools/${tool.id}.webp`),
          ]
        : [],
    );
  }, [key, state.character]);
  useEffect(() => {
    const target = candidateRetryFocus.current;
    if (
      target?.key === key &&
      candidateFailures.length === 0 &&
      sceneArt?.items[target.id]
    ) {
      document.getElementById(`extra-${target.id}`)?.focus();
      candidateRetryFocus.current = null;
    }
  }, [candidateFailures, sceneArt, key]);
  useEffect(() => () => retainArtCache([]), []);
  useEffect(() => {
    if (state.step !== "end") return;
    setName("");
    setCharacter("");
    setSaved({});
  }, [state.step]);
  useEffect(() => {
    if (!map || !activity) return;
    let current = true;
    setLoadError("");
    Promise.all([
      loadSceneArt(
        map.id,
        activeItems(map.id, state.extras).map((item) => item.asset),
      ),
      Promise.all(
        [
          `assets/characters/${state.character}.webp`,
          ...tools.map((tool) => `assets/tools/${tool.id}.webp`),
        ].map(loadImage),
      ),
    ])
      .then(([value]) => {
        if (!current) return;
        setArt((previous) => ({
          key,
          value: {
            ...value,
            items: {
              ...(previous?.key === key ? previous.value.items : {}),
              ...value.items,
            },
          },
        }));
        // A missing optional candidate must not hold the eight base objects in a loading state.
        map.extras.forEach((item) => {
          loadSceneItem(map.id, item.asset)
            .then((loaded) => {
              if (!current) return;
              setArt((previous) => ({
                key,
                value: {
                  ...value,
                  items: {
                    ...(previous?.key === key
                      ? previous.value.items
                      : value.items),
                    [item.asset]: loaded,
                  },
                },
              }));
              setCandidateFailures((previous) =>
                previous.filter((id) => id !== item.asset),
              );
            })
            .catch(() => {
              if (current)
                setCandidateFailures((previous) => [
                  ...new Set([...previous, item.asset]),
                ]);
            });
        });
      })
      .catch(() => {
        if (current) setLoadError("공간 그림을 불러오지 못했어요.");
      });
    return () => {
      current = false;
    };
  }, [key, activity, retry, state.extras.join(","), state.character]);
  useEffect(() => {
    if (state.step !== "result") {
      setResultPreviewOpen(false);
      setResult(undefined);
      setResultError("");
      return;
    }
    let current = true,
      url: string | undefined;
    const controller = new AbortController();
    const request = `${state.sessionId}:${state.revision}:${initialSignature(state)}`;
    setResult(undefined);
    setResultError("");
    import("./rendering/export")
      .then((module) => module.exportResult(state, controller.signal))
      .then((blob) => {
        const latest = stateRef.current;
        if (
          !current ||
          latest.step !== "result" ||
          request !==
            `${latest.sessionId}:${latest.revision}:${initialSignature(latest)}`
        )
          return;
        url = URL.createObjectURL(blob);
        setResult({ url, bytes: blob.size });
      })
      .catch(() => {
        if (current)
          setResultError("결과 이미지를 만들지 못했어요. 다시 만들어 주세요.");
      });
    return () => {
      current = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.step, state.revision, retry]);

  function startNew() {
    try {
      localStorage.removeItem(storageKey(location.href));
      setNotice("");
    } catch {
      /* Activity works without storage. */
    }
    setSaved({});
    setName("");
    setCharacter("");
    setMessage("");
    dispatch({ type: "BEGIN" });
  }
  /** Back to the first screen; progress already saved on this device stays available as 이어하기. */
  function goHome() {
    if (state.step === "landing") return;
    const home = () => {
      dispatch({ type: "NEW" });
      setSaved(safeRead());
    };
    if (["profile", "end"].includes(state.step) || safeRead().saved) home();
    else
      setConfirmation({
        text: "이 기기에는 활동을 저장할 수 없어요. 처음 화면으로 가면 지금 활동이 지워져요.",
        button: "처음 화면으로",
        onConfirm: home,
      });
  }
  function confirm(text: string, button: string, action: Action) {
    setConfirmation({ text, button, onConfirm: () => dispatch(action) });
  }
  function place(id: string, point: Point, surfaceId?: string, angle?: number) {
    const checked = tryPlacement(state, id, point, surfaceId, angle);
    setMessage(checked.message);
    if (checked.placement) {
      dispatch({ type: "MOVE", id, placement: checked.placement });
      setPlacing(false);
      setHighlight("");
    }
    return checked.placement;
  }
  function checkOrganizing() {
    dispatch({ type: "START_CLEAN" });
  }
  function beginPlacing() {
    setPlacing(true);
    setMessage("");
    document
      .querySelector(".scene")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function rotateSelected(direction: -1 | 1) {
    if (!selected || !selectedPlacement || !selectedCanRotate) return;
    const angle =
      ((Math.round(selectedPlacement.angle / 15) * 15 +
        direction * 15 +
        540) %
        360) -
      180;
    place(
      selected,
      selectedPlacement,
      selectedPlacement.surface,
      angle,
    );
  }
  function cleanSpot(index: number) {
    if (!state.ventilated) {
      setMessage("먼저 환기하기를 눌러 주세요.");
      return;
    }
    const required = availableTool(state),
      spot = geometry!.dirt[index];
    if (!tool || tool !== spot.tool || tool !== required) {
      setMessage(
        required === "duster"
          ? "손걸레를 고른 뒤 가구의 먼지 표시를 눌러 주세요."
          : required === "broom"
            ? "빗자루를 고른 뒤 바닥의 먼지 표시를 눌러 주세요."
            : "바닥걸레를 고른 뒤 바닥의 얼룩 표시를 눌러 주세요.",
      );
      return;
    }
    dispatch({ type: "CLEAN", spot: index, tool });
    setMessage(
      index === 2
        ? "바닥의 먼지를 쓸었어요."
        : index === 3
          ? ""
          : "가구의 먼지를 닦았어요.",
    );
  }
  function homeButton() {
    return (
      <button
        className="text-button"
        aria-label="처음 화면으로 가기"
        onClick={goHome}
      >
        처음 화면으로
      </button>
    );
  }
  function activityProfile() {
    return (
      <section className="activity-profile" aria-label="오늘의 정리 주인공">
        <div className="profile-portrait">
          <img
            src={assetUrl(`assets/characters/${state.character}.webp`)}
            alt={`내가 고른 ${characters.find((c) => c.id === state.character)?.label ?? "캐릭터"}`}
          />
        </div>
        <div className="activity-profile-name">
          <p className="profile-eyebrow">오늘의 정리 주인공</p>
          <h2>
            <span>{state.name}</span>
            <small>님</small>
          </h2>
          <dl className="profile-map-name">
            <div>
              <dt>정리할 공간</dt>
              <dd>{map?.name}</dd>
            </div>
          </dl>
        </div>
        {activitySettings()}
      </section>
    );
  }
  function activitySettings() {
    return (
      <div className="activity-settings" aria-label="활동 설정">
        <span className="activity-settings-label">활동 설정</span>
        <div className="activity-settings-actions">
          {state.step !== "setup" && homeButton()}
          {activity && (
            <button
              className="text-button"
              onClick={() =>
                confirm(
                  "다른 공간을 고르면 지금 공간의 활동이 지워져요.",
                  "다른 공간 선택",
                  { type: "CHANGE_MAP" },
                )
              }
            >
              다른 공간 선택
            </button>
          )}
        </div>
      </div>
    );
  }
  const phaseIndex = state.step === "organize" || state.step === "setup" ? 0 : state.step === "clean" ? 1 : 2;

  return (
    <main className={`app-shell ${activity || state.step === "quiz" || state.step === "result" ? "in-activity" : ""}`}>
      <header className="topbar">
        <a
          className="brand"
          href="./"
          aria-label="처음 화면으로 가기"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <img
              className="brand-icon"
              src={`${import.meta.env.BASE_URL}app-icon.webp`}
              alt=""
            />
          </span>
          <span className="brand-copy">
            <span className="brand-kicker">즐겁게 배우고, 직접 실천해요</span>
            <strong className="brand-title">정리 정돈과 청소 성향 알아보기</strong>
          </span>
        </a>
        <div
          className="topbar-lesson"
          aria-label="5학년, 쾌적한 생활 공간 관리"
        >
          <span className="grade-chip">
            <span aria-hidden="true">✦</span>
            5학년
          </span>
          <span className="lesson-copy">
            <small>오늘의 배움</small>
            <strong>쾌적한 생활 공간 관리</strong>
          </span>
        </div>
      </header>
      {notice && (
        <p className="storage-notice" role="status">
          {notice}
        </p>
      )}

      {state.step === "landing" && (
        <section className="landing" aria-labelledby="landing-title">
          <div className="hero-copy">
            <div className="lesson-meta">
              <span className="eyebrow">2. 쾌적한 생활 공간 관리</span>
              <span className="lesson-label">6차시</span>
            </div>
            <h1 id="landing-title" tabIndex={-1}>
              내가 정리하는 생활 공간
            </h1>
            <div className="hero-intro-card">
              <span className="hero-intro-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 12.5 9.2 17 19 7" />
                </svg>
              </span>
              <div>
                <p className="hero-description">
                  물건을 <Key tone="space">제자리</Key>에 두면 다시 찾기 쉽고,
                  쓸 자리도 넓어져요.
                </p>
                <p className="hero-instruction">
                  공간을 하나 골라 물건을 <Key tone="space">정리</Key>하고{" "}
                  <Key tone="clean">먼지</Key>를 닦아 주세요.
                </p>
              </div>
            </div>
          </div>
          <section className="lesson-path" aria-labelledby="lesson-path-title">
            <header className="lesson-path-heading">
              <span className="section-kicker">활동 순서</span>
              <div>
                <h2 id="lesson-path-title">세 단계로 차근차근 완성해요</h2>
                <p>고른 공간을 직접 정리하고 깨끗하게 마무리해요.</p>
              </div>
            </header>
            <div className="lesson-path-grid">
              {[
                ["정리 정돈", "물건을 꺼내고 자리를 정해요."],
                ["먼지와 얼룩 청소", "남은 먼지와 얼룩을 닦아요."],
                ["전후 모습 살펴보기", "달라진 공간을 확인해요."],
              ].map(([title, description], i) => (
                <div className="lesson-step" key={title}>
                  <span>0{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="hero-visual">
            <div className="hero-scene">
              <img
                className="hero-background"
                src={assetUrl("assets/maps/school-desk/thumbnail.webp")}
                alt="물건을 정리할 교실 책상"
              />
            </div>
            <div className="hero-caption">
              <span>오늘은 내 손으로</span>
              <strong>쓰던 물건의 자리를 정해요.</strong>
            </div>
            <img
              className="hero-rabbit"
              src={assetUrl("assets/characters/rabbit.webp")}
              alt="토끼 안내 캐릭터"
            />
          </div>
          <div className="hero-action-area">
            <p className="privacy-note">
              <span aria-hidden="true">✓</span>
              이름과 활동 내용은 이 기기에만 저장하고 서버로 보내지 않아요.
            </p>
            {saved.saved ? (
              <div className="resume-box">
                <div className="resume-heading">
                  <span aria-hidden="true">↻</span>
                  <div>
                    <small>저장된 활동</small>
                    <strong>이 기기에 이어 할 활동이 있어요.</strong>
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    className="button"
                    onClick={() => {
                      dispatch({ type: "RESTORE", session: saved.saved! });
                      setSaved({});
                    }}
                  >
                    이어하기
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      setConfirmation({
                        text: "저장된 활동을 지우고 새로 시작할까요?",
                        button: "처음부터",
                        onConfirm: startNew,
                      })
                    }
                  >
                    처음부터
                  </button>
                </div>
              </div>
            ) : (
              <div className="start-box">
                <NextStep label="활동 준비" compact>
                  오늘 <Key tone="space">정리할 공간</Key>을 만나 볼까요?
                </NextStep>
                <button className="button hero-cta" onClick={startNew}>
                  활동 시작 <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {state.step === "profile" && (
        <section className="profile-card panel">
          <header className="profile-intro">
            <div className="profile-title">
              <span className="eyebrow">6차시 · 시작하기 전</span>
              <h1 tabIndex={-1}>오늘의 정리 활동을 시작해요</h1>
              <p>
                화면에 표시할 이름을 적고, 활동 순서를 함께 살펴볼 안내
                친구를 골라 주세요.
              </p>
            </div>
            <aside className="profile-principles" aria-label="오늘 생각할 정리 기준">
              <span className="profile-principles-kicker">오늘 생각할 것</span>
              <strong>
                정리 정돈을 할 때는 물건의 <Key tone="sort">쓰임</Key>을 고려하여{" "}
                <Key tone="space">보관 장소</Key>를 정해요.
              </strong>
              <ul>
                <li>다시 찾기 쉽게</li>
                <li>자주 쓰면 꺼내기 쉽게</li>
                <li>함께 쓰면 누구나 알기 쉽게</li>
              </ul>
            </aside>
          </header>
          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (composing.current) return;
              if (!validName(name)) {
                setMessage(
                  "이름이나 별명을 1~10자로 적어 주세요. 한글, 영문, 숫자와 띄어쓰기를 사용할 수 있어요.",
                );
                return;
              }
              if (!character) {
                setMessage("활동을 함께할 안내 캐릭터를 골라 주세요.");
                return;
              }
              setMessage("");
              dispatch({ type: "PROFILE", name, character });
            }}
          >
            <section className="profile-step" aria-labelledby="profile-name-title">
              <header className="profile-step-heading">
                <span className="profile-step-number" aria-hidden="true">
                  1
                </span>
                <div>
                  <h2 id="profile-name-title">이름 또는 별명 적기</h2>
                  <p>내 활동 화면과 저장할 결과 그림에 표시돼요.</p>
                </div>
              </header>
              <div className="profile-name-field">
                <label className="input-label" htmlFor="student-name">
                  이름 또는 별명
                </label>
                <input
                  id="student-name"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (message) setMessage("");
                  }}
                  onCompositionStart={() => {
                    composing.current = true;
                  }}
                  onCompositionEnd={() => {
                    composing.current = false;
                  }}
                  aria-describedby="name-help name-privacy"
                />
                <div className="profile-name-help">
                  <p id="name-help">이름이나 별명을 1~10자로 적어 주세요.</p>
                  <p id="name-privacy">
                    <span aria-hidden="true">✓</span>
                    이 기기에만 저장해요.
                  </p>
                </div>
              </div>
            </section>

            <section
              className="profile-step character-step"
              aria-labelledby="profile-character-title"
            >
              <header className="profile-step-heading">
                <span className="profile-step-number" aria-hidden="true">
                  2
                </span>
                <div>
                  <h2 id="profile-character-title">공간 요정 선택하기</h2>
                  <p>고른 친구가 다음 화면부터 활동 순서를 함께 알려 줘요.</p>
                </div>
              </header>
              <div
                className="character-grid"
                role="group"
                aria-labelledby="profile-character-title"
              >
                {characters.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`character-choice ${character === c.id ? "selected" : ""}`}
                    aria-pressed={character === c.id}
                    onClick={() => {
                      setCharacter(c.id);
                      if (message) setMessage("");
                    }}
                  >
                    {character === c.id && (
                      <small>
                        <span aria-hidden="true">✓</span> 선택됨
                      </small>
                    )}
                    <span className="character-picture">
                      <img
                        src={assetUrl(`assets/characters/${c.id}.webp`)}
                        alt=""
                      />
                    </span>
                    <span className="character-name">{c.label}</span>
                  </button>
                ))}
              </div>
            </section>
            {message && (
              <p className="feedback" role="alert">
                {message}
              </p>
            )}
            <footer className="profile-actions">
              <NextStep>
                먼저 할 일을 <Key tone="sort">네 가지</Key>로 나눠 본 뒤{" "}
                <Key tone="space">정리할 공간</Key>을 골라요.
              </NextStep>
              <button className="button" type="submit">
                다음 <span aria-hidden="true">→</span>
              </button>
            </footer>
          </form>
        </section>
      )}

      {state.step === "tutorial" && (
        <QuestionCards
          kind="tutorial"
          onDone={() => dispatch({ type: "TUTORIAL_DONE" })}
        />
      )}
      {state.step === "maps" && (
        <MapSelection onSelect={(mapId) => dispatch({ type: "MAP", mapId })} />
      )}

      {(activity || state.step === "quiz" || state.step === "result") && (
          <section className="activity-heading">
            <div className="activity-heading-main">
              <div className="activity-space">
                <span>정리할 공간</span>
                <strong>{map?.name}</strong>
              </div>
              <div className="activity-heading-copy">
                <span className="activity-heading-label">지금 할 일</span>
                <h1 tabIndex={-1}>
                  {state.step === "setup"
                    ? "물건 고르기"
                    : state.step === "organize"
                      ? "물건 놓을 자리 정하기"
                      : state.step === "clean" ? "남은 먼지와 얼룩 청소하기" : "활동 마무리"}
                </h1>
              </div>
            </div>
            <div className="activity-progress">
              <span className="activity-progress-label">활동 단계</span>
              <ol className="stepper" aria-label="활동 순서">
                {["정리 정돈", "청소", "마무리"].map((text, i) => (
                  <li
                    key={text}
                    className={i < phaseIndex ? "is-complete" : undefined}
                    aria-current={phaseIndex === i ? "step" : undefined}
                  >
                    <span aria-hidden="true">{i < phaseIndex ? "✓" : i + 1}</span>
                    <strong>{text}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </section>
      )}
      {activity && map && geometry && (
        <>
          <div className="activity-layout workspace-layout">
            <div className="workspace-main">
              <section className="scene-card">
              <div className="scene-wrap">
                {model ? (
                  <>
                    <Suspense
                      fallback={
                        <div className="loading">공간을 준비하고 있어요.</div>
                      }
                    >
                      <Scene
                        model={model}
                        onSelect={(id) => {
                          setSelected(id);
                          setHighlight("");
                          setMessage("");
                          setPlacing(false);
                        }}
                        onDrop={place}
                        onPoint={(point) => {
                          if (placing && selected) place(selected, point);
                        }}
                        onUnavailablePoint={(point) => {
                          const nearDirt = geometry.dirt.some(
                            (spot) =>
                              Math.hypot(point.x - spot.x, point.y - spot.y) < 38,
                          );
                          const unavailableMessage = nearDirt
                            ? "먼지는 정리를 마친 뒤 청소해요."
                            : "이곳은 옮기는 물건이 아니에요. 물건을 눌러 골라 주세요.";
                          setMessage(unavailableMessage);
                          return unavailableMessage;
                        }}
                        tapPlacement={placing}
                        locked={state.step !== "organize"}
                      />
                    </Suspense>
                    {state.step === "clean" &&
                      geometry.dirt.map(
                        (spot, i) =>
                          !state.cleaned.includes(i) &&
                          tool === spot.tool &&
                          spot.tool === availableTool(state) && (
                            <button
                              key={i}
                              className="dirt-hit is-current is-ready"
                              style={{
                                left: `${spot.x / 9.6}%`,
                                top: `${spot.y / 7.2}%`,
                              }}
                              onClick={() => cleanSpot(i)}
                              aria-label={`${i < 2 ? "가구 먼지" : i === 2 ? "바닥 먼지" : "바닥 얼룩"} ${i + 1} 청소하기`}
                            >
                              <span aria-hidden="true">✦</span>
                            </button>
                          ),
                      )}
                  </>
                ) : (
                  <div className="loading">
                    <div>
                      <p>{loadError || "공간 그림을 불러오고 있어요."}</p>
                      {loadError && (
                        <button
                          className="button secondary"
                          onClick={() => setRetry(retry + 1)}
                        >
                          다시 불러오기
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {state.step === "organize" && chosen && (
                <div
                  className="scene-action-bar"
                  role="group"
                  aria-label={`${chosen.label} 조작`}
                >
                  <div className="scene-action-selection">
                    <span>선택한 물건</span>
                    <strong>{chosen.label}</strong>
                  </div>
                  {selectedCanRotate ? (
                    <div className="scene-rotate-control">
                      <span className="scene-action-label">방향 바꾸기</span>
                      <div className="scene-rotate-buttons">
                        <button
                          type="button"
                          onClick={() => rotateSelected(-1)}
                          aria-label={`${chosen.label} 왼쪽으로 돌리기`}
                        >
                          <span aria-hidden="true">↶</span>
                          왼쪽 돌리기
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateSelected(1)}
                          aria-label={`${chosen.label} 오른쪽으로 돌리기`}
                        >
                          <span aria-hidden="true">↷</span>
                          오른쪽 돌리기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="scene-action-note">
                      이 물건은 방향을 바꾸지 않고 옮겨요.
                    </p>
                  )}
                </div>
              )}
              <div className="scene-caption">
                {state.step === "setup"
                  ? "더 고르지 않아도 바로 시작할 수 있어요."
                  : state.step === "organize"
                    ? map.copy
                    : "먼지 표시를 눌러 청소해 주세요."}
              </div>
              </section>
              {state.step === "organize" && (
                <section className="extras-tray" aria-labelledby="extras-title">
                  <div className="panel-heading">
                    <div className="extras-heading-copy">
                      <div className="extras-title-row">
                        <span className="extras-title-icon" aria-hidden="true">+</span>
                        <div>
                          <h2 id="extras-title">추가로 꺼낼 물건</h2>
                          <p>
                            클릭하면 물건이 나타나고, 다시 클릭하면 물건이 사라져요
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="selection-count" role="status" aria-label={`3개 중 ${state.extras.length}개 선택`}>
                      <span>선택</span>
                      <strong>{state.extras.length}</strong>
                      <span>/ 3</span>
                    </span>
                  </div>
                  <div className="extra-list">
                    {map.extras.map((item) => (
                      <button
                        key={item.id}
                        id={`extra-${item.asset}`}
                        className={`extra-card ${state.extras.includes(item.id) ? "selected" : ""}`}
                        aria-pressed={state.extras.includes(item.id)}
                        disabled={
                          (!sceneArt?.items[item.asset] &&
                            !state.extras.includes(item.id))
                        }
                        onClick={() => {
                          const changed = toggleExtra(state, item.id);
                          setMessage(changed.message);
                          if (changed.state !== state) {
                            dispatch({ type: "EXTRA", id: item.id });
                            setSelected(changed.state.extras.includes(item.id) ? item.id : selected === item.id ? "" : selected);
                            setHighlight("");
                            setPlacing(false);
                          }
                        }}
                      >
                        {sceneArt?.items[item.asset] ? (
                          <img
                            src={assetUrl(assetsById[item.asset].path)}
                            alt=""
                          />
                        ) : (
                          <span className="asset-pending" aria-hidden="true">
                            ↻
                          </span>
                        )}
                        <strong>{item.label}</strong>
                        {state.extras.includes(item.id) && (
                          <span className="extra-card-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        {(candidateFailures.includes(item.asset) ||
                          !sceneArt?.items[item.asset]) && (
                          <span className="extra-load-state" aria-hidden="true">
                            {candidateFailures.includes(item.asset)
                              ? "그림 준비 실패"
                              : "불러오는 중"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {candidateFailures.length > 0 && (
                    <div className="candidate-error">
                      <p role="status">
                        {map.extras
                          .filter((item) =>
                            candidateFailures.includes(item.asset),
                          )
                          .map((item) => item.label)
                          .join(", ")}{" "}
                        그림을 불러오지 못했어요. 다른 물건으로 시작해도 돼요.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => {
                          candidateRetryFocus.current = {
                            key,
                            id: candidateFailures[0],
                          };
                          setRetry((value) => value + 1);
                        }}
                      >
                        물건 그림 다시 불러오기
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
            <aside className="activity-sidebar" aria-label="내 활동">
              {activityProfile()}
              {state.step !== "setup" && (
              <div className="side-panel activity-panel">
              {state.step === "organize" && (
                <>
                  <div className="organize-inventory">
                  <div className="panel-heading">
                    <h2>옮길 물건</h2>
                    <span className="count-chip">{items.length}개</span>
                  </div>
                  <div className="activity-items">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        className={`compact-item ${selected === item.id ? "selected" : ""}`}
                        aria-pressed={selected === item.id}
                        onClick={() => {
                          setSelected(item.id);
                          setHighlight("");
                          setMessage("");
                          setPlacing(false);
                        }}
                      >
                        <img
                          src={assetUrl(assetsById[item.asset].path)}
                          alt=""
                        />
                        <span>{item.label}</span>
                        {selected === item.id && (
                          <span className="compact-item-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  </div>
                  {chosen ? (
                    <div className="selected-tools">
                      <strong>선택한 물건: {chosen.label}</strong>
                      <p>
                        물건을 끌어 옮기거나, 아래에서 놓을 곳을 고른 뒤 장면의
                        자리를 눌러 주세요.
                      </p>
                      <div className="surface-options">
                        {geometry.surfaces
                          .filter((s) => chosen.zones.includes(s.zone))
                          .map((s) => (
                            <button
                              key={s.id}
                              className={
                                placing && highlight === s.id ? "active" : ""
                              }
                              aria-pressed={placing && highlight === s.id}
                              onClick={() => {
                                if (placing && highlight === s.id) {
                                  setHighlight("");
                                  setPlacing(false);
                                  setMessage("");
                                } else {
                                  setHighlight(s.id);
                                  beginPlacing();
                                }
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="panel-intro">
                      장면이나 목록에서 옮길 물건을 먼저 골라 주세요.
                    </p>
                  )}
                  <NextStep compact>
                    <Key tone="clean">남은 먼지와 얼룩</Key>을 청소해요.
                  </NextStep>
                  <button
                    className="button primary-action"
                    disabled={!model}
                    onClick={checkOrganizing}
                  >
                    정리를 마치고 청소하기
                  </button>
                </>
              )}
              {state.step === "clean" && (
                <>
                  <h2>
                    {!state.ventilated
                      ? "청소 준비"
                      : state.cleaned.length === 4
                        ? "도구 정리하기"
                        : availableTool(state) === "duster"
                          ? "가구의 먼지 닦기"
                          : availableTool(state) === "broom"
                            ? "바닥의 먼지 쓸기"
                            : "바닥의 얼룩 닦기"}
                  </h2>
                  <p className="panel-intro">
                    {!state.ventilated ? (
                      <>
                        청소 도구를 준비하고 창문을 열어{" "}
                        <Key tone="clean">환기</Key>해요.
                      </>
                    ) : state.cleaned.length === 4 ? (
                      <>
                        사용한 청소 도구를 <Key tone="space">제자리</Key>에
                        놓아 주세요.
                      </>
                    ) : availableTool(state) === "duster" ? (
                      <>
                        <Key tone="clean">손걸레</Key>를 고른 뒤{" "}
                        <Key tone="space">가구</Key>의 먼지 표시를 눌러 주세요.
                      </>
                    ) : availableTool(state) === "broom" ? (
                      <>
                        <Key tone="clean">빗자루</Key>를 고른 뒤{" "}
                        <Key tone="space">바닥</Key>의 먼지 표시를 눌러 주세요.
                      </>
                    ) : (
                      <>
                        <Key tone="clean">바닥걸레</Key>를 고른 뒤{" "}
                        <Key tone="space">바닥</Key>의 얼룩 표시를 눌러 주세요.
                      </>
                    )}
                  </p>
                  <button
                    className={`ventilate ${state.ventilated ? "done" : ""}`}
                    disabled={state.ventilated}
                    onClick={() => {
                      dispatch({ type: "VENTILATE" });
                      setMessage("환기했어요.");
                    }}
                  >
                    <span aria-hidden="true">▦</span>
                    {state.ventilated ? "환기했어요." : "환기하기"}
                  </button>
                  <div className="tool-list">
                    {tools.map((t) => (
                      <button
                        key={t.id}
                        aria-pressed={tool === t.id}
                        className={tool === t.id ? "selected" : ""}
                        disabled={availableTool(state) !== t.id}
                        onClick={() => {
                          setTool(t.id);
                          setMessage("");
                        }}
                      >
                        <img
                          src={assetUrl(`assets/tools/${t.id}.webp`)}
                          alt=""
                        />
                        <span>{t.label}</span>
                        {availableTool(state) !== t.id && (
                          <small>
                            {state.cleaned.length === 4 ||
                            (t.id === "duster" && state.cleaned.includes(1)) ||
                            (t.id === "broom" && state.cleaned.includes(2))
                              ? "완료"
                              : "차례를 기다려요"}
                          </small>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="small-note">
                    실제로 사용한 걸레는 깨끗이 빨아 햇볕에 말린 뒤 보관해요.
                  </p>
                  {state.cleaned.length === 4 && (
                    <>
                      <NextStep compact>
                        <span className="quiz-next-copy">
                          <Key tone="result">마무리 퀴즈</Key>를 해봐요.
                        </span>
                      </NextStep>
                      <button
                        className="button primary-action"
                        onClick={() => dispatch({ type: "STORE_TOOLS" })}
                      >
                        도구 정리하기 →
                      </button>
                    </>
                  )}
                </>
              )}
              {message && (
                <p className="feedback" role="status">
                  {message}
                </p>
              )}
              </div>
              )}
            </aside>
          </div>
          <div className="activity-footer">
            {state.step === "organize" && (
              <p>
                화면에서는 <Key tone="space">물건 정리</Key>를 먼저 연습해요.
                실제 청소는 도구와 옷차림을 준비하고{" "}
                <Key tone="clean">환기</Key>한 뒤 시작해요.
              </p>
            )}

          </div>
        </>
      )}

      {state.step === "quiz" && (
        <div className="activity-layout finish-layout">
          <QuestionCards
            kind="quiz"
            onDone={({ correctCount }) =>
              dispatch({ type: "QUIZ_DONE", correctCount })
            }
          />
          <aside className="activity-sidebar" aria-label="내 활동">
            {activityProfile()}
          </aside>
        </div>
      )}
      {state.step === "result" && (
        <div className="activity-layout finish-layout">
        <section className="result-page" aria-labelledby="result-title">
          <header className="result-summary">
            <div className="result-summary-copy">
              <span className="result-summary-badge">
                <span aria-hidden="true">✓</span>
                활동을 모두 마쳤어요
              </span>
              <h1 id="result-title" tabIndex={-1}>
                {state.name}님의 공간이 이렇게 달라졌어요
              </h1>
              <p>
                {result ? (
                  <>
                    <strong>{map?.name}</strong>의 <Key tone="space">정리 전</Key>과{" "}
                    <Key tone="clean">청소 후</Key> 모습을 나란히 살펴봐요.
                  </>
                ) : (
                  resultError || "결과 이미지를 만들고 있어요."
                )}
              </p>
            </div>
            <div className="result-summary-side">
              <section
                className="result-quiz-summary"
                aria-label={`마무리 퀴즈 ${quiz.length}문제 중 ${state.quizCorrectCount ?? 0}문제를 맞혔어요`}
                data-result-screen-only="true"
              >
                <span className="result-quiz-icon" aria-hidden="true">✓</span>
                <div className="result-quiz-copy">
                  <span>마무리 퀴즈</span>
                  <p>
                    <strong>{state.quizCorrectCount ?? 0}</strong>
                    <b>/ {quiz.length}문제</b>
                    <small>맞혔어요</small>
                  </p>
                </div>
                <span className="result-screen-only-note">
                  화면에서만 확인
                </span>
              </section>
            </div>
          </header>
          {result ? (
            <>
              <figure className="result-preview">
                <figcaption className="result-preview-heading">
                  <span className="result-preview-icon" aria-hidden="true">↔</span>
                  <span>
                    <small>BEFORE · AFTER</small>
                    <strong>정리 전과 청소 후를 한눈에 비교해요</strong>
                  </span>
                  <span className="result-preview-map">{map?.name}</span>
                </figcaption>
                <img
                  src={result.url}
                  alt="정리 전 모습과 청소 후 모습을 비교한 결과 이미지"
                />
              </figure>
              <div className="result-completion">
                <div className="result-instructions">
                  <div className="result-next">
                    <NextStep>
                      <Key tone="result">이미지를 저장</Key>한 뒤 선생님이 안내한{" "}
                      <Key tone="space">패들렛</Key>에 올려 주세요.
                    </NextStep>
                  </div>
                  <p className="result-guidance">
                    저장 버튼이 작동하지 않으면 크게 보기를 연 뒤 이미지를 길게 눌러
                    저장해 주세요.
                  </p>
                </div>
                <div className="result-actions" aria-label="결과 이미지">
                  <a
                    className="button"
                    href={result.url}
                    download={`정리와청소_${state.name}_${map?.name}.png`}
                    onClick={() =>
                      setMessage(
                        "이미지 저장을 요청했어요. 내려받은 파일을 확인해 주세요.",
                      )
                    }
                  >
                    다했어요!
                  </a>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setResultPreviewOpen(true)}
                  >
                    <span aria-hidden="true">⛶</span>
                    이미지 보기
                  </button>
                </div>
              </div>
            </>
          ) : resultError ? (
            <button className="button" onClick={() => setRetry(retry + 1)}>
              다시 만들기
            </button>
          ) : (
            <div className="loading result-loading">
              결과 이미지를 만들고 있어요.
            </div>
          )}
          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}
        </section>
        <aside className="activity-sidebar" aria-label="내 활동">
          {activityProfile()}
        </aside>
        </div>
      )}
      <ResultImageDialog
        open={resultPreviewOpen}
        src={result?.url}
        alt="정리 전 모습과 청소 후 모습을 비교한 결과 이미지"
        onClose={() => setResultPreviewOpen(false)}
      />
      {state.step === "end" && (
        <section className="end-card panel">
          <img src={assetUrl("assets/characters/rabbit.webp")} alt="" />
          <h1 tabIndex={-1}>정리와 청소 연습을 마쳤어요</h1>
          <p>
            교실이나 집에서도 사용한 물건을 <Key tone="space">제자리</Key>에
            놓아 보세요.
          </p>
          <button className="button" onClick={startNew}>
            새 활동 시작 →
          </button>
        </section>
      )}
      <ConfirmDialog
        value={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </main>
  );
}
