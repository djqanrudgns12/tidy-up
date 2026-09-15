/** Required additional drawings. They are counted separately from the 72 kinds of object. */
export const assetViews = [
  ...[
    "textbook",
    "notebook",
    "homework-diary",
    "story-book",
    "science-book",
    "picture-book",
    "science-comic",
    "dictionary",
    "magazine",
    "reading-notebook",
    "document-folder",
  ].map((asset) => ({
    asset,
    view: "shelf",
    purpose: "세워 꽂았을 때 책등과 윗면이 보이는 모습",
    direction:
      "Upright on its bottom edge, viewed almost frontally with a narrow top and side visible; recognizable spine and original cover colours, no text. Never flatten a cover view into a fake book spine.",
  })),
  ...["board-game", "puzzle-box", "block-box", "card-game"].map((asset) => ({
    asset,
    view: "low-front",
    purpose: "낮은 선반에서 상자 앞면과 얕은 윗면이 함께 보이는 모습",
    direction:
      "Closed box resting on its base, low near-frontal camera with a shallow top face visible. Preserve the exact construction, lid design and dimensions of the reference object; no open or detached parts.",
  })),
  ...["jacket", "cardigan", "hanger"].map((asset) => ({
    asset,
    view: "alternate-support",
    purpose: "눕혀 둔 모습과 걸어 둔 모습의 구별",
    direction:
      "Create the complementary support view to the approved primary artwork: if the reference is hanging, draw the same garment/hanger laid flat and viewed straight down; if laid flat, draw its naturally hanging front view. Keep the garment construction and hanger attachment believable. Do not fold by stretching the image.",
  })),
  ...["sneakers", "indoor-shoes", "sandals", "rain-boots"].map((asset) => ({
    asset,
    view: "shelf-front",
    purpose: "신발장 선반에 두었을 때 앞코와 밑창이 보이는 모습",
    direction:
      "A matching left and right pair resting flat on their soles, near-front shelf view with only a small amount of the upper openings visible. Preserve left/right construction, material and proportions of the primary reference. Both soles share one level support plane.",
  })),
].map((view) => ({
  ...view,
  path: `assets/items/views/${view.asset}--${view.view}.webp`,
}));
