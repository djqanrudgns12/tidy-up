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
const BoxReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/BoxReview").then(module => ({default: module.BoxReview})))
  : () => null;
const CabinetLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/CabinetLayoutReview").then(module=>({default:module.CabinetLayoutReview})))
  : () => null;
const LockerLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/LockerLayoutReview").then(module=>({default:module.LockerLayoutReview})))
  : () => null;
const LibraryLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/LibraryLayoutReview").then(module=>({default:module.LibraryLayoutReview})))
  : () => null;
const HomeDeskLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/HomeDeskLayoutReview").then(module=>({default:module.HomeDeskLayoutReview})))
  : () => null;
const BedroomLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/BedroomLayoutReview").then(module=>({default:module.BedroomLayoutReview})))
  : () => null;
const WardrobeLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/WardrobeLayoutReview").then(module=>({default:module.WardrobeLayoutReview})))
  : () => null;
const AllPlacementReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/AllPlacementReview").then(module=>({default:module.AllPlacementReview})))
  : () => null;
const FinalLayoutReview = import.meta.env.DEV
  ? React.lazy(() => import("./proof/FinalLayoutReview").then(module=>({default:module.FinalLayoutReview})))
  : () => null;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense
        fallback={<p className="loading">공간을 준비하고 있어요.</p>}
      >
        {import.meta.env.DEV && new URLSearchParams(location.search).has("all-placements") ? (
          <AllPlacementReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("final-layout") ? (
          <FinalLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("wardrobe-layout") ? (
          <WardrobeLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("bedroom-layout") ? (
          <BedroomLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("home-desk-layout") ? (
          <HomeDeskLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("library-layout") ? (
          <LibraryLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("locker-layout") ? (
          <LockerLayoutReview />
        ) : import.meta.env.DEV &&
        new URLSearchParams(location.search).has("cabinet-layout") ? (
          <CabinetLayoutReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("box-review") ? (
          <BoxReview />
        ) : import.meta.env.DEV && new URLSearchParams(location.search).has("cabinet-review") ? (
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
