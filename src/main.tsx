import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./style.css";

const Proof = import.meta.env.DEV
  ? React.lazy(() =>
      import("./proof/Proof").then((module) => ({ default: module.Proof })),
    )
  : () => null;
const PlacementReview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./proof/PlacementReview").then((module) => ({
        default: module.PlacementReview,
      })),
    )
  : () => null;
const ResponsiveReview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./proof/ResponsiveReview").then((module) => ({
        default: module.ResponsiveReview,
      })),
    )
  : () => null;
const isProof =
  import.meta.env.DEV && new URLSearchParams(location.search).has("proof");
const CabinetReview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./proof/CabinetReview").then((module) => ({
        default: module.CabinetReview,
      })),
    )
  : () => null;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense
        fallback={<p className="loading">공간을 준비하고 있어요.</p>}
      >
        {import.meta.env.DEV &&
        new URLSearchParams(location.search).has("cabinet-review") ? (
          <CabinetReview />
        ) : import.meta.env.DEV &&
          new URLSearchParams(location.search).has("responsive") ? (
          <ResponsiveReview />
        ) : import.meta.env.DEV &&
          new URLSearchParams(location.search).has("review") ? (
          <PlacementReview />
        ) : isProof ? (
          <Proof />
        ) : (
          <App />
        )}
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
