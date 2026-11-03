import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root)));
const s=read('public/data/serviceOutcomes.json'),t=read('public/data/trafficCounts.json'),m=read('data-sources/outcomes-manifest.json');
assert.equal(s.rows.length,5);assert.equal(t.rows.length,9);
for(const r of s.rows){assert.equal(r.total,r.validClosed+r.missingClosed+r.excludedClosed);assert(r.validClosed>0);assert(r.meanDays>=0);assert(r.medianDays>=0);assert(r.surveyPositive<=r.surveyValid);assert(r.agreementPct>=0&&r.agreementPct<=100);assert.equal(r.surveyResponses,Object.values(r.ratings).reduce((a,b)=>a+b,0));}
assert.equal(s.audit.totalRequests,s.rows.reduce((n,r)=>n+r.total,0)+s.audit.unknownBoroughRequests);
assert.equal(t.audit.completeHours,t.rows.reduce((n,r)=>n+r.completeHours,0));
assert(t.audit.completeHours>0,'At least one measured hour is required');
for(const r of t.rows){if(!r.completeHours)assert.equal(r.meanVehiclesPerObservedHour,null);else assert(r.meanVehiclesPerObservedHour>=0&&r.segments>0&&r.observedDays>0);}
for(const [i,key] of ['closureTotals-2025','closureDays-2025','satisfaction-2025','traffic-2025','traffic-2024','traffic-2023'].entries()){
 const raw=read(`data-sources/${key}.json`),q=m.queries.find(q=>q.id===(i>=3?'7ym2-wayt':i===2?'5ijn-vbdv':'erm2-nwe9')&&q.rows===raw.length);
 assert(q,'query evidence '+key);assert.equal(createHash('sha256').update(JSON.stringify(raw)).digest('hex'),q.sha256);
}
console.log('Cierres, denominadores, satisfacción, aforos y huellas de consultas: OK');
