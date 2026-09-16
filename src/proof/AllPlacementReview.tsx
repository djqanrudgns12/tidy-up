import { useEffect, useRef, useState } from "react";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { auditMap } from "./placement-audit";
import { loadSceneArt } from "../rendering/art";
import { paintScene, visualBounds } from "../rendering/paint";
import { renderLogicalScene } from "../rendering/export";

/** Development-only, actual assets at fixed size. Each cell is an independent placement. */
export function AllPlacementReview() {
  const [mapId,setMapId]=useState("school-desk"),[status,setStatus]=useState(""),[url,setUrl]=useState("");
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let current=true;
    setUrl("");setStatus("실제 원화를 불러와 전 물건의 대안 배치를 그리는 중");
    (async()=>{
      const rows=auditMap(mapId), map=mapsById[mapId], geometry=physicalMaps[mapId];
      const art=await loadSceneArt(mapId,rows.map(r=>r.item.asset));
      if(!current||!canvas.current)return;
      const sheet=canvas.current;sheet.width=1200;sheet.height=Math.ceil(rows.length*2/4)*230;
      const ctx=sheet.getContext("2d")!;ctx.fillStyle="#f4f6f0";ctx.fillRect(0,0,sheet.width,sheet.height);
      let index=0, checked=0, mismatch=0;
      for(const row of rows) {
        const possible=row.places.filter(p=>p.placement&&p.surface.id!=="floor");
        const ordinary=possible.find(p=>row.item.zones.includes(p.surface.zone))??possible[0];
        const alternative=possible.find(p=>!row.item.zones.includes(p.surface.zone))??possible.find(p=>p.flat)??possible.at(-1)!;
        for(const [variant,place] of [ordinary,alternative].entries()) {
          if(!current)return;
          const p=(variant===1?place.flat:undefined)??place.placement!;
          const model={mapId,geometry,items:[row.item],placements:{[row.item.id]:p},art,showDirt:false};
          const view=document.createElement("canvas");view.width=960;view.height=720;
          paintScene(view.getContext("2d")!,model,false);
          const exported=renderLogicalScene(model);
          const a=new Uint32Array(view.getContext("2d")!.getImageData(0,0,960,720).data.buffer);
          const b=new Uint32Array(exported.getContext("2d")!.getImageData(0,0,960,720).data.buffer);
          if(a.some((v,i)=>v!==b[i]))mismatch++;
          checked++;
          const bounds=visualBounds(row.item,p,place.surface,mapId);
          const width=Math.max(190,Math.min(600,Math.max(bounds.right-bounds.left+120,(bounds.bottom-bounds.top+60)/.6)));
          const height=width*.6;
          const left=Math.max(0,Math.min(960-width,(bounds.left+bounds.right)/2-width/2));
          const top=Math.max(0,Math.min(720-height,(bounds.top+bounds.bottom)/2-height/2+12));
          const x=(index%4)*300,y=Math.floor(index/4)*230;
          ctx.fillStyle="#203b2f";ctx.font="bold 17px sans-serif";ctx.fillText(`${row.item.label} · ${variant===0?"기본":"대안"}`,x+8,y+22);
          ctx.font="14px sans-serif";ctx.fillText(`${place.surface.label}${p.bookPose==="flat"?" / 눕힘":""}`,x+8,y+43);
          ctx.drawImage(view,left,top,width,height,x+6,y+50,288,173);
          view.width=0;exported.width=0;index++;
        }
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
      if(!current)return;
      setUrl(sheet.toDataURL("image/png"));
      setStatus(`${map.name}: ${rows.length}개 물건 · ${checked}개 실제 배치 · 화면/PNG 불일치 ${mismatch} · 가능한 물건/면 조합 ${rows.reduce((n,r)=>n+r.places.filter(p=>p.placement).length,0)}`);
    })().catch(e=>{if(current)setStatus(`검수 오류: ${String(e)}`);});
    return()=>{current=false;};
  },[mapId]);
  return <main style={{padding:16,maxWidth:1240,margin:"auto"}}>
    <h1>모든 공간·물건의 실제 대안 배치</h1>
    <p>각 칸은 한 물건의 독립 배치입니다. 원화 크기·자세·지지·앞턱을 확인합니다.</p>
    <label>검수 공간 <select aria-label="검수 공간" value={mapId} onChange={e=>setMapId(e.target.value)}>
      {Object.keys(physicalMaps).map(id=><option key={id} value={id}>{mapsById[id].name}</option>)}
    </select></label>
    <p role="status">{status}</p>
    {url&&<a download={`placement-audit-${mapId}.png`} href={url}>검수 PNG 저장</a>}
    <canvas ref={canvas} style={{display:"block",width:"100%",height:"auto",marginTop:12}} aria-label="모든 물건 대안 배치 검수 시트"/>
  </main>;
}
