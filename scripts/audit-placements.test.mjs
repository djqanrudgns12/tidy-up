import { it,expect } from "vitest";
import { mkdirSync,writeFileSync } from "node:fs";
import { auditAllMaps } from "../src/proof/placement-audit";

it("전수 배치 검사 결과와 재현 좌표를 프로젝트 내부에 기록한다",()=>{
  const report=auditAllMaps(), entries=report.flatMap(m=>m.rows.flatMap(r=>r.places));
  const result={maps:report.length,items:report.reduce((n,m)=>n+m.rows.length,0),distinctAssets:new Set(report.flatMap(m=>m.rows.map(r=>r.item.asset))).size,pairs:entries.length,valid:entries.filter(p=>p.placement).length,flat:entries.filter(p=>p.flat).length,
    missing:report.flatMap(m=>m.rows.filter(r=>!r.places.some(p=>p.placement&&p.surface.id!=="floor")).map(r=>`${m.mapId}/${r.item.asset}`)),report};
  mkdirSync("output/qa",{recursive:true});
  writeFileSync("output/qa/all-placement-audit.json",JSON.stringify(result,null,2));
  expect(result.missing).toEqual([]);
},30000);
