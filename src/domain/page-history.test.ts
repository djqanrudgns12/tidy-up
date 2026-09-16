import { describe, expect, it } from "vitest";
import { makeSession, type Session } from "./session";
import {
  createPageHistory,
  pageAtOffset,
  recordPage,
  replaceCurrentPage,
} from "./page-history";

function at(step: Session["step"], revision: number): Session {
  return { ...makeSession(), step, revision };
}

describe("page history", () => {
  it("records one snapshot per visited screen", () => {
    let history = createPageHistory(at("landing", 0));
    history = recordPage(history, at("profile", 1));
    history = recordPage(history, at("tutorial", 2));

    expect(history.entries.map((entry) => entry.step)).toEqual([
      "landing",
      "profile",
      "tutorial",
    ]);
    expect(pageAtOffset(history, -1)?.session.step).toBe("profile");
    expect(pageAtOffset(history, 1)).toBeNull();
  });

  it("updates the current page and discards forward history after a new choice", () => {
    const landing = at("landing", 0);
    const profile = at("profile", 1);
    const tutorial = at("tutorial", 2);
    let history = createPageHistory(landing);
    history = recordPage(history, profile);
    history = recordPage(history, tutorial);
    history = { ...history, index: 1 };
    history = recordPage(history, { ...profile, revision: 7, character: "bear" });

    expect(history.entries).toHaveLength(2);
    expect(history.entries[1].revision).toBe(7);
    expect(history.entries[1].character).toBe("bear");
  });

  it("keeps forward pages when a restored snapshot is refreshed", () => {
    let history = createPageHistory(at("landing", 0));
    history = recordPage(history, at("profile", 1));
    history = recordPage(history, at("tutorial", 2));
    history = { ...history, index: 1 };
    history = replaceCurrentPage(history, at("profile", 8));

    expect(history.entries.map((entry) => entry.step)).toEqual([
      "landing",
      "profile",
      "tutorial",
    ]);
    expect(pageAtOffset(history, 1)?.session.step).toBe("tutorial");
  });

  it("starts a fresh history after returning to the first screen", () => {
    let history = createPageHistory(at("profile", 1));
    history = recordPage(history, at("tutorial", 2));
    history = recordPage(history, at("landing", 3));

    expect(history.entries.map((entry) => entry.step)).toEqual(["landing"]);
    expect(history.index).toBe(0);
  });
});
