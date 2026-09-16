import { useEffect, useRef, useState } from "react";
import { assetsById } from "../data/catalog";
import { loadSceneArt } from "../rendering/art";
import { hitObject, paintScene, type SceneModel } from "../rendering/paint";
import { renderLogicalScene } from "../rendering/export";
import { sizeOf } from "../domain/placement";
import type { ArtCollection, PhysicalMap } from "../domain/types";

// Measured empty upper-left shelf. This probe does not approve the full activity.
const geometry: PhysicalMap = {
  surfaces: [{ id: "shelf", label: "놀이 상자 선반", zone: 1,
    polygon: [160,260,462,260,462,316,114,316], depth: .3, shadow: .2,
    occluders: [[113,317,463,317,463,330,113,330]] }],
  initial: [], slots: [], dirt: [],
};
const items = ["board-game", "puzzle-box", "card-game"].map(id => ({id,asset:id,label:assetsById[id].label,zones:[1]}));
const placements = Object.fromEntries(items.map((item,i) => [item.id,{surface:"shelf",x:[195,313,418][i],y:301,angle:0}]));
export function BoxReview() {
  const [art,setArt] = useState<ArtCollection>();
  const [report,setReport] = useState("그림을 준비하고 있어요.");
  const [png,setPng] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let current = true;
    loadSceneArt("classroom-cabinet",items.map(i=>i.asset)).then(value=>{if(current)setArt(value);}).catch(e=>{if(current)setReport(e.message);});
    return ()=>{current=false;};
  },[]);
  useEffect(() => {
    if (!art || !canvas.current) return;
    const model: SceneModel = {mapId:"classroom-cabinet",geometry,items,placements,art,showDirt:false};
    const ctx = canvas.current.getContext("2d")!;
    paintScene(ctx,model,false);
    const exported = renderLogicalScene(model);
    const a = ctx.getImageData(0,0,960,720).data;
    const b = exported.getContext("2d")!.getImageData(0,0,960,720).data;
    let maxDifference = 0;
    for(let i=0;i<a.length;i++) maxDifference=Math.max(maxDifference,Math.abs(a[i]-b[i]));
    const hitChecks = items.every(item=>{
      const p=placements[item.id], [w,h]=sizeOf(assetsById[item.asset],model.mapId);
      return hitObject(model,item,{x:p.x,y:p.y-h/2}) && !hitObject(model,item,{x:p.x+w/2+2,y:p.y-h/2});
    });
    setReport(`화면·PNG 픽셀 최대 차이 ${maxDifference} · 상자 3개 내부/외부 클릭 판정 ${hitChecks?"통과":"실패"}`);
    setPng(exported.toDataURL("image/png"));
    exported.width=0; exported.height=0;
  },[art]);
  return <main className="app-shell placement-review">
    <span className="eyebrow">개발용 검수 · 선반 상자 시점</span>
    <h1>선반 상자 시점 검수</h1>
    <p role="status">{report}</p>
    <p>실제 낮은 정면 원화, 알파 클릭 판정, 공통 저장 렌더러를 확인합니다.</p>
    {png && <a className="button secondary" href={png} download="cabinet-box-view-review.png">검수 PNG 저장</a>}
    <figure><canvas ref={canvas} width={960} height={720} aria-label="수납장 선반 위 상자 3개 시점 검수" /></figure>
  </main>;
}
