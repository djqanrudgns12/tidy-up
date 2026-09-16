import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { maps, mapsById } from "./data/maps";
import { assetsById } from "./data/catalog";
import { characters, tools } from "./data/lesson";
import { physicalMaps } from "./data/physical";
import {
  activeItems,
  availableTool,
  initialPlacements,
  initialSignature,
  makeSession,
  reducer,
  tryPlacement,
  unfinished,
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
import { ConfirmDialog, type Confirmation } from "./components/ConfirmDialog";

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
    [character, setCharacter] = useState("rabbit"),
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
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const [candidateFailures, setCandidateFailures] = useState<string[]>([]);
  const candidateRetryFocus = useRef<{ key: string; id: string } | null>(null);
  const [result, setResult] = useState<{ url: string; bytes: number }>(),
    [resultError, setResultError] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;
  const map = state.mapId ? mapsById[state.mapId] : null,
    geometry = state.mapId ? physicalMaps[state.mapId] : null;
  const items = map ? activeItems(map.id, state.extras) : [];
  const key = map ? `${map.id}:${map.revision}` : "";
  const sceneArt = art?.key === key ? art.value : undefined;
  const activity = ["setup", "organize", "clean"].includes(state.step);
  const chosen = items.find((item) => item.id === selected);
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
          showDirt: true,
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
    setBusy(false);
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
    setCharacter("rabbit");
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
    setCharacter("rabbit");
    dispatch({ type: "BEGIN" });
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
    }
    return checked.placement;
  }
  function checkOrganizing() {
    const remaining = unfinished(state);
    if (remaining.length)
      setMessage(
        `아직 제자리에 놓지 않은 물건이 ${remaining.length}개 있어요. 다시 살펴볼 물건: ${remaining
          .slice(0, 2)
          .map((i) => i.label)
          .join(", ")}`,
      );
    else dispatch({ type: "START_CLEAN" });
  }
  function beginPlacing() {
    setPlacing(true);
    setMessage("물건을 놓을 위치를 눌러 주세요.");
    document
      .querySelector(".scene")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
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
          ? "바닥의 얼룩을 닦았어요."
          : "가구의 먼지를 닦았어요.",
    );
  }
  function endActivityButton() {
    return (
      <button
        className="button secondary"
        onClick={() =>
          confirm(
            result
              ? "이미지를 저장했나요? 활동을 끝내면 이 기기의 이름과 활동 내용을 지워요."
              : "활동을 끝내면 이 기기의 이름과 활동 내용을 지워요.",
            "활동 끝내기",
            { type: "END" },
          )
        }
      >
        활동 끝내기
      </button>
    );
  }
  function resetButton() {
    return (
      <button
        className="text-button"
        onClick={() =>
          confirm(
            "고른 물건은 그대로 두고, 정리와 청소를 처음부터 다시 할까요?",
            "다시 시작",
            { type: "RESET" },
          )
        }
      >
        처음 상태로 되돌리기
      </button>
    );
  }
  const phaseIndex =
    state.step === "setup"
      ? 0
      : state.step === "organize"
        ? 1
        : state.step === "clean"
          ? 2
          : 3;

  return (
    <main className={`app-shell ${activity ? "in-activity" : ""}`}>
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            ⌂
          </span>{" "}
          생활을 가꾸는 실과
        </span>
        <span className="eyebrow">5학년 · 쾌적한 생활 공간 관리</span>
      </header>
      {notice && (
        <p className="storage-notice" role="status">
          {notice}
        </p>
      )}

      {state.step === "landing" && (
        <section className="landing">
          <div className="hero-copy">
            <span className="eyebrow">2. 쾌적한 생활 공간 관리</span>
            <p className="lesson-label">6차시 | 정리 정돈과 청소를 실천해요</p>
            <h1 tabIndex={-1}>
              내가 정리하는
              <br />
              생활 공간
            </h1>
            <p className="hero-description">
              물건을 제자리에 두면 다시 찾기 쉽고,
              <br className="desktop-break" /> 쓸 자리도 넓어져요.
            </p>
            <p>공간을 하나 골라 물건을 정리하고 먼지를 닦아 주세요.</p>
            {saved.saved ? (
              <div className="resume-box">
                <strong>이 기기에 이어 할 활동이 있어요.</strong>
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
              <button className="button hero-cta" onClick={startNew}>
                활동 시작 <span aria-hidden="true">→</span>
              </button>
            )}
            <p className="privacy-note">
              이름과 활동 내용은 이 기기에만 저장해요.
              <br />
              서버로 보내지 않아요.
            </p>
          </div>
          <div className="hero-scene">
            <img
              className="hero-background"
              src={assetUrl("assets/maps/school-desk/thumbnail.webp")}
              alt="물건을 정리할 교실 책상"
            />
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
          <div className="lesson-path">
            {[
              "물건 고르기",
              "정리 정돈",
              "먼지와 얼룩 청소",
              "전후 모습 살펴보기",
            ].map((text, i) => (
              <div key={text}>
                <span>0{i + 1}</span>
                <strong>{text}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.step === "profile" && (
        <section className="profile-card panel">
          <span className="eyebrow">활동 준비</span>
          <h1 tabIndex={-1}>내 활동을 준비해요</h1>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (composing.current) return;
              if (!validName(name)) {
                setMessage(
                  "이름이나 별명을 1~10자로 적어 주세요. 한글, 영문, 숫자와 띄어쓰기를 사용할 수 있어요.",
                );
                return;
              }
              dispatch({ type: "PROFILE", name, character });
            }}
          >
            <label className="input-label" htmlFor="student-name">
              이름 또는 별명
            </label>
            <input
              id="student-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              aria-describedby="name-help"
            />
            <p id="name-help">이름이나 별명을 1~10자로 적어 주세요.</p>
            <h2 className="character-heading">안내 캐릭터를 골라 주세요.</h2>
            <div className="character-grid">
              {characters.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`character-choice ${character === c.id ? "selected" : ""}`}
                  aria-pressed={character === c.id}
                  onClick={() => setCharacter(c.id)}
                >
                  <img
                    src={assetUrl(`assets/characters/${c.id}.webp`)}
                    alt=""
                  />
                  <span>{c.label}</span>
                  {character === c.id && <small>선택됨</small>}
                </button>
              ))}
            </div>
            {message && (
              <p className="feedback" role="alert">
                {message}
              </p>
            )}
            <button className="button" type="submit">
              다음 →
            </button>
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
        <section className="map-selection">
          <div className="page-heading">
            <div>
              <span className="eyebrow">정리할 공간 선택</span>
              <h1 tabIndex={-1}>어느 공간을 정리할까요?</h1>
              <p>학교와 집에서 자주 쓰는 물건을 정리해요.</p>
            </div>
          </div>
          {(["school", "home"] as const).map((category) => (
            <section key={category} className="map-group">
              <h2>{category === "school" ? "학교 공간" : "가정 공간"}</h2>
              <div className="map-grid">
                {maps
                  .filter((map) => map.category === category)
                  .map((map) => (
                    <button
                      key={map.id}
                      className="map-card"
                      onClick={() => dispatch({ type: "MAP", mapId: map.id })}
                      disabled={!physicalMaps[map.id]}
                    >
                      {physicalMaps[map.id] ? (
                        <img
                          src={assetUrl(`assets/maps/${map.id}/thumbnail.webp`)}
                          alt=""
                        />
                      ) : (
                        <div className="map-pending">준비 중</div>
                      )}
                      <div>
                        <h3>{map.name}</h3>
                        <p>{map.copy}</p>
                      </div>
                      <span className="map-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </section>
      )}

      {activity && map && geometry && (
        <>
          <section className="activity-heading">
            <div>
              <span className="eyebrow">{map.name}</span>
              <h1 tabIndex={-1}>
                {state.step === "setup"
                  ? "물건 고르기"
                  : state.step === "organize"
                    ? "물건 놓을 자리 정하기"
                    : "남은 먼지와 얼룩 청소하기"}
              </h1>
            </div>
            <ol className="stepper" aria-label="활동 순서">
              {["물건 선택", "정리 정돈", "청소", "마무리"].map((text, i) => (
                <li
                  key={text}
                  aria-current={phaseIndex === i ? "step" : undefined}
                >
                  <span>{i + 1}</span>
                  {text}
                </li>
              ))}
            </ol>
          </section>
          <div className="activity-layout">
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
                        tapPlacement={placing}
                        locked={state.step !== "organize"}
                      />
                    </Suspense>
                    {state.step === "clean" &&
                      geometry.dirt.map(
                        (spot, i) =>
                          !state.cleaned.includes(i) && (
                            <button
                              key={i}
                              className="dirt-hit"
                              style={{
                                left: `${spot.x / 9.6}%`,
                                top: `${spot.y / 7.2}%`,
                              }}
                              onClick={() => cleanSpot(i)}
                              aria-label={`${i < 2 ? "가구 먼지" : i === 2 ? "바닥 먼지" : "바닥 얼룩"} ${i + 1} 청소하기`}
                            >
                              {i + 1}
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
              <div className="scene-caption">
                {state.step === "setup"
                  ? "더 고르지 않아도 바로 시작할 수 있어요."
                  : state.step === "organize"
                    ? "물건을 골라 놓을 자리를 정해 주세요."
                    : "먼지 표시를 눌러 청소해 주세요."}
              </div>
            </section>
            <aside className="side-panel activity-panel">
              {state.step === "setup" && (
                <>
                  <div className="panel-heading">
                    <h2>더 꺼낼 물건</h2>
                    <span className="count-chip">{state.extras.length}/3</span>
                  </div>
                  <p className="panel-intro">
                    이 공간에서 쓸 물건을 3개까지 더 고를 수 있어요.
                  </p>
                  <div className="extra-list">
                    {map.extras.map((item) => (
                      <button
                        key={item.id}
                        id={`extra-${item.asset}`}
                        className={`extra-card ${state.extras.includes(item.id) ? "selected" : ""}`}
                        aria-pressed={state.extras.includes(item.id)}
                        disabled={
                          busy ||
                          (!sceneArt?.items[item.asset] &&
                            !state.extras.includes(item.id))
                        }
                        onClick={() => {
                          if (
                            !state.extras.includes(item.id) &&
                            state.extras.length === 3
                          )
                            setMessage(
                              "3개를 골랐어요. 바꾸려면 고른 물건을 먼저 눌러 주세요.",
                            );
                          else {
                            dispatch({ type: "EXTRA", id: item.id });
                            setMessage("");
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
                        <span>
                          <strong>{item.label}</strong>
                          <small>
                            {candidateFailures.includes(item.asset)
                              ? "그림을 불러오지 못했어요."
                              : (item.purpose ??
                                assetsById[item.asset].purpose)}
                          </small>
                        </span>
                        <span className="check-circle" aria-hidden="true">
                          {state.extras.includes(item.id) ? "✓" : "+"}
                        </span>
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
                  <p className="small-note">
                    고른 물건을 다시 누르면 선택을 취소할 수 있어요.
                  </p>
                  <button
                    className="button primary-action"
                    disabled={!model || busy}
                    onClick={async () => {
                      if (!model) return;
                      const revision = state.revision;
                      setBusy(true);
                      try {
                        const { renderLogicalScene } = await import(
                          "./rendering/export"
                        );
                        const before = renderLogicalScene(model);
                        before.width = 0;
                        before.height = 0;
                        if (
                          stateRef.current.revision === revision &&
                          stateRef.current.step === "setup"
                        )
                          dispatch({ type: "CONFIRM_SET" });
                      } catch {
                        setMessage(
                          "정리 전 모습을 준비하지 못했어요. 다시 눌러 주세요.",
                        );
                        setBusy(false);
                      }
                      setBusy(false);
                    }}
                  >
                    {busy
                      ? "정리 전 모습을 준비하고 있어요."
                      : "이 물건으로 정리 시작"}
                  </button>
                </>
              )}
              {state.step === "organize" && (
                <>
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
                      </button>
                    ))}
                  </div>
                  {chosen ? (
                    <div className="selected-tools">
                      <strong>선택한 물건: {chosen.label}</strong>
                      <p>
                        놓을 수 있는 곳:{" "}
                        {chosen.zones
                          .map((z) => (z === 5 ? "휴지통" : map.zones[z - 1]))
                          .join(", ")}
                      </p>
                      <div className="surface-options">
                        {geometry.surfaces
                          .filter((s) => chosen.zones.includes(s.zone))
                          .map((s) => (
                            <button
                              key={s.id}
                              className={highlight === s.id ? "active" : ""}
                              onClick={() => {
                                setHighlight(highlight === s.id ? "" : s.id);
                                beginPlacing();
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => {
                          if (placing) {
                            setPlacing(false);
                            setMessage("");
                          } else beginPlacing();
                        }}
                      >
                        {placing ? "취소" : "여기에 놓기"}
                      </button>
                      {poseOf(
                        assetsById[chosen.asset],
                        geometry.surfaces.find(
                          (s) => s.id === state.placements[selected].surface,
                        )!,
                        map.id,
                      ) === "flat" ? (
                        <div className="rotate-actions">
                          {[-1, 1].map((direction) => (
                            <button
                              key={direction}
                              onClick={() => {
                                const p = state.placements[selected];
                                const angle =
                                  ((Math.round(p.angle / 15) * 15 +
                                    direction * 15 +
                                    540) %
                                    360) -
                                  180;
                                place(selected, p, p.surface, angle);
                              }}
                              aria-label={
                                direction === -1
                                  ? "왼쪽으로 돌리기"
                                  : "오른쪽으로 돌리기"
                              }
                            >
                              {direction === -1 ? "↶" : "↷"} 돌리기
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="small-note">
                          이 물건은 방향을 바꾸지 않고 옮겨요.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="panel-intro">
                      끌기 어렵다면 목록에서 물건을 고른 뒤 ‘여기에 놓기’를 눌러
                      주세요.
                    </p>
                  )}
                  <button
                    className="button primary-action"
                    onClick={checkOrganizing}
                  >
                    정리 확인하기 →
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
                    {!state.ventilated
                      ? "청소 도구를 준비하고 창문을 열어 환기해요."
                      : state.cleaned.length === 4
                        ? "사용한 청소 도구를 제자리에 놓아 주세요."
                        : availableTool(state) === "duster"
                          ? "손걸레를 고른 뒤 가구의 먼지 표시를 눌러 주세요."
                          : availableTool(state) === "broom"
                            ? "빗자루를 고른 뒤 바닥의 먼지 표시를 눌러 주세요."
                            : "바닥걸레를 고른 뒤 바닥의 얼룩 표시를 눌러 주세요."}
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
                    <button
                      className="button primary-action"
                      onClick={() => dispatch({ type: "STORE_TOOLS" })}
                    >
                      도구 정리하기 →
                    </button>
                  )}
                </>
              )}
              {message && (
                <p className="feedback" role="status">
                  {message}
                </p>
              )}
            </aside>
          </div>
          <div className="activity-footer">
            <div className="character-guide">
              <img
                src={assetUrl(`assets/characters/${state.character}.webp`)}
                alt=""
              />
              <p>
                {state.step === "organize"
                  ? "화면에서는 물건 정리를 먼저 연습해요. 실제 청소는 도구와 옷차림을 준비하고 환기한 뒤 시작해요."
                  : map.copy}
              </p>
            </div>
            <div className="footer-actions">
              {state.step !== "setup" && resetButton()}
              {state.step === "organize" && (
                <button
                  className="text-button"
                  onClick={() =>
                    confirm(
                      "물건을 다시 고르면 정리한 물건이 처음 자리로 돌아가요. 다시 고를까요?",
                      "다시 고르기",
                      { type: "CHANGE_ITEMS" },
                    )
                  }
                >
                  물건 다시 고르기
                </button>
              )}
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
            </div>
          </div>
        </>
      )}

      {state.step === "quiz" && (
        <>
          <QuestionCards
            kind="quiz"
            onDone={() => dispatch({ type: "QUIZ_DONE" })}
          />
          <div className="center-actions">{resetButton()}</div>
        </>
      )}
      {state.step === "result" && (
        <section className="result-page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">활동 마무리</span>
              <h1 tabIndex={-1}>달라진 모습을 살펴봐요</h1>
              <p>
                {result
                  ? "정리 전 모습과 청소 후 모습을 한 장에 담았어요."
                  : resultError || "결과 이미지를 만들고 있어요."}
              </p>
            </div>
          </div>
          {result ? (
            <>
              <div className="result-preview">
                <img
                  src={result.url}
                  alt="정리 전 모습과 청소 후 모습을 비교한 결과 이미지"
                />
              </div>
              <div className="result-actions">
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
                  이미지 저장 ↓
                </a>
                <a
                  className="button secondary"
                  href={result.url}
                  target="_blank"
                  rel="noopener"
                >
                  이미지 크게 보기 ↗
                </a>
                {endActivityButton()}
              </div>
              <p className="result-guidance">
                저장 버튼이 작동하지 않으면 이미지를 크게 열고 길게 눌러 저장해
                주세요.
              </p>
              <p className="result-guidance">
                이미지를 저장한 뒤 선생님이 안내한 패들렛에 올려 주세요.
              </p>
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
          {!result && (
            <div className="result-actions">{endActivityButton()}</div>
          )}
          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}
          <div className="center-actions">{resetButton()}</div>
        </section>
      )}
      {state.step === "end" && (
        <section className="end-card panel">
          <img src={assetUrl("assets/characters/rabbit.webp")} alt="" />
          <h1 tabIndex={-1}>정리와 청소 연습을 마쳤어요</h1>
          <p>교실이나 집에서도 사용한 물건을 제자리에 놓아 보세요.</p>
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
