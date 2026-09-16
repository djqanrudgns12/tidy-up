import { useState } from "react";
import { maps } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { assetUrl } from "../rendering/art";
import { Key } from "./Guide";

const categories = [
  { id: "all", label: "전체" },
  { id: "school", label: "학교" },
  { id: "home", label: "집" },
] as const;

export function MapSelection({ onSelect }: { onSelect: (id: string) => void }) {
  const [category, setCategory] = useState<(typeof categories)[number]["id"]>("all");
  const visibleMaps = maps.filter((map) => category === "all" || map.category === category);
  const title = category === "all" ? "전체 공간" : category === "school" ? "학교에서" : "집에서";

  return (
    <section className="map-selection" aria-labelledby="map-selection-title">
      <header className="map-selection-header">
        <div className="map-intro">
          <span className="map-intro-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="10" height="10" rx="3" />
              <rect x="18" y="4" width="10" height="10" rx="3" />
              <rect x="4" y="18" width="10" height="10" rx="3" />
              <path d="m19 23 3 3 6-7" />
            </svg>
          </span>
          <div>
            <span className="section-kicker">공간 고르기</span>
            <h1 id="map-selection-title" tabIndex={-1}>어느 공간을 정리할까요?</h1>
            <p>내가 정리하고 싶은 <Key tone="space">공간</Key>을 선택해 봅시다.</p>
          </div>
        </div>
        <div className="map-filter-bar">
          <div className="map-filters" role="group" aria-label="공간 종류">
            {categories.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={category === id} aria-controls="map-options" onClick={() => setCategory(id)}>
                {label}
                <span>{maps.filter((map) => id === "all" || map.category === id).length}</span>
              </button>
            ))}
          </div>
          <span className="map-filter-hint">마음에 드는 곳을 <Key tone="sort">한 곳</Key> 골라 주세요.</span>
        </div>
      </header>

      <section id="map-options" className="map-group" aria-labelledby="map-group-title">
        <div className="map-group-heading">
          <h2 id="map-group-title">{title}</h2>
          <span role="status">{visibleMaps.length}곳</span>
        </div>
        <div className={`map-grid map-grid--${category}`}>
          {visibleMaps.map((map) => (
            <button key={map.id} type="button" className="map-card" onClick={() => onSelect(map.id)} disabled={!physicalMaps[map.id]}>
              {physicalMaps[map.id] ? (
                <img src={assetUrl(`assets/maps/${map.id}/thumbnail.webp`)} alt="" />
              ) : (
                <div className="map-pending">준비 중</div>
              )}
              <div className="map-card-copy">
                <span className={`map-category map-category--${map.category}`}>{map.category === "school" ? "학교" : "집"}</span>
                <h3>{map.name}</h3>
                <p>{map.copy}</p>
                <span className="map-arrow" aria-hidden="true">→</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
