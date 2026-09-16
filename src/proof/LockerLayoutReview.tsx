import { useEffect,useRef,useState } from "react";
import { lockerCombinations,lockerFixture } from "../data/locker-fixtures";
import { mapsById } from "../data/maps";
import { loadSceneArt } from "../rendering/art";
import { paintScene } from "../rendering/paint";
import { renderLogicalScene } from "../rendering/export";
import type { ArtCollection } from "../domain/types";

export function LockerLayoutReview() {
  const [art,setArt]=useState<ArtCollection>(), [error,setError]=useState("");
  const [choice,setChoice]=useState(41), [organized,setOrganized]=useState(true);
  const [moving,setMoving]=useState(""), [progress,setProgress]=useState(100);
  const [reverse,setReverse]=useState(false);
  const [sheets,setSheets]=useState<{name:string;url:string}[]>([]),[audit,setAudit]=useState("");
  const [thumbnail,setThumbnail]=useState("");
  const [auditing,setAuditing]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let current=true;
    const map=mapsById["locker"];
    loadSceneArt(map.id,[...map.base,...map.extras].map(i=>i.asset)).then(a=>{if(current)setArt(a);}).catch(e=>{if(current)setError(e.message);});
    return ()=>{current=false;};
  },[]);
  const fixture=lockerFixture(lockerCombinations[choice],organized);
  useEffect(()=>{
    if(!art||!canvas.current)return;
    const before=lockerFixture(lockerCombinations[choice],false);
    const after=lockerFixture(lockerCombinations[choice],true);
    paintScene(canvas.current.getContext("2d")!,{...fixture,art,showDirt:false,
      motion:moving&&fixture.items.some(i=>i.id===moving)?{id:moving,from:reverse?after.placements[moving]:before.placements[moving],to:reverse?before.placements[moving]:after.placements[moving],progress:progress/100}:undefined},false);
    const base=renderLogicalScene({...lockerFixture([],false),art,showDirt:false});
    setThumbnail(base.toDataURL("image/png"));base.width=0;
  },[art,choice,organized,moving,progress,reverse]);
  async function makeSheets() {
    if(!art||auditing)return;
    setAuditing(true);
    const results:{name:string;url:string}[]=[];
    let maximumDifference=0;
    try { for(const organized of [false,true]) for(let page=0;page<7;page++) {
      setAudit(`${organized?"정리 후":"초기"} 검수 시트 ${page+1}/7 생성 중`);
      await new Promise<void>(resolve=>window.setTimeout(resolve,0));
      const sheet=document.createElement("canvas");sheet.width=1440;sheet.height=772;
      const ctx=sheet.getContext("2d")!;ctx.fillStyle="#f5f7f2";ctx.fillRect(0,0,1440,772);
      for(let cell=0;cell<6;cell++) {
        const index=page*6+cell;
        const model={...lockerFixture(lockerCombinations[index],organized),art,showDirt:false};
        const view=document.createElement("canvas");view.width=960;view.height=720;
        paintScene(view.getContext("2d")!,model,false);
        const exported=renderLogicalScene(model);
        const a=view.getContext("2d")!.getImageData(0,0,960,720).data,b=exported.getContext("2d")!.getImageData(0,0,960,720).data;
        for(let i=0;i<a.length;i++)maximumDifference=Math.max(maximumDifference,Math.abs(a[i]-b[i]));
        const x=(cell%3)*480,y=Math.floor(cell/3)*386;
        ctx.fillStyle="#20352d";ctx.font="15px sans-serif";ctx.fillText(`${index+1}: ${lockerCombinations[index].join(",")||"기본8개"}`,x+8,y+18);
        ctx.drawImage(view,x,y+26,480,360);
        view.width=0;exported.width=0;
      }
      results.push({name:`locker-${organized?"after":"before"}-${page+1}.png`,url:sheet.toDataURL("image/png")});sheet.width=0;
    }
    setSheets(results);setAudit(`42조합 × 초기/정리 후 = 84장 · 화면/PNG 픽셀 최대 차이 ${maximumDifference}`);
    } catch(error) { setAudit(`검수 실패: ${String(error)}`); }
    finally { setAuditing(false); }
  }
  return <main className="app-shell placement-review">
    <span className="eyebrow">개발용 검수</span>
    <h1>사물함 전체 배치 검수</h1>
    <p>사물함 활동의 42조합과 크기·가림·수납 경로를 확인합니다.</p>
    <p role="status">{error || `추가 선택 ${choice+1}/42 · ${fixture.items.length}개 물건`}</p>
    <label>추가 물건 조합 <select aria-label="추가 물건 조합" value={choice} onChange={e=>{setChoice(+e.target.value);setMoving("");}}>
      {lockerCombinations.map((ids,i)=><option key={i} value={i}>{i+1}: {ids.join(",")||"없음"}</option>)}
    </select></label>
    <button className="button secondary" onClick={()=>setOrganized(!organized)}>{organized?"정리 전 보기":"정리 후 보기"}</button>
    <label>수납할 물건 <select aria-label="수납할 물건" value={moving} onChange={e=>setMoving(e.target.value)}>
      <option value="">정지 장면</option>{fixture.items.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}
    </select></label>
    <label><input type="checkbox" checked={reverse} onChange={e=>setReverse(e.target.checked)}/> 꺼내기 방향</label>
    <label>수납 진행 {progress}% <input aria-label="수납 진행" type="range" min={0} max={100} value={progress} onChange={e=>setProgress(+e.target.value)} /></label>
    <button disabled={!art||auditing} className="button secondary" onClick={makeSheets}>42조합 검수 자료 만들기</button>
    <p role="status">{audit}</p>
    {thumbnail&&<a href={thumbnail} download="locker-base-thumbnail-source.png">기본8개 썸네일 원본</a>}
    {sheets.map(sheet=><a key={sheet.name} href={sheet.url} download={sheet.name}>{sheet.name} </a>)}
    <figure><canvas ref={canvas} width={960} height={720} aria-label="사물함 전체 물건 배치 검수" /></figure>
  </main>;
}
