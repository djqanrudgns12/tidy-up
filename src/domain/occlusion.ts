import { pointInPolygon } from "./placement";
import type { PerforatedPanel, Point } from "./types";

/** The plastic bars cover an object; a real opening must also remain open for hit testing. */
export function coveredByPanel(point: Point, panel: PerforatedPanel) {
  return (
    pointInPolygon(point, panel.polygon) &&
    !panel.openings.some((opening) => pointInPolygon(point, opening))
  );
}
