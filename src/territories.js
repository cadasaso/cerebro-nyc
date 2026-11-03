const statusLabels={estimated:'Estimación ACS',low_reliability:'Fiabilidad baja',censored:'Valor limitado por umbral',missing:'Sin dato',not_applicable:'No aplicable',derived:'Registros asignados',partial:'Cobertura parcial',outside_coverage:'Fuera de cobertura'};
export function selectTerritories(data,{borough='all',universe='residential',query='',metric='population'}={}){
  const q=query.trim().toLocaleLowerCase();
  return data.rows.filter(r=>(borough==='all'||r.borough===borough)&&(universe==='all'||(universe==='residential'?r.residential:!r.residential))&&`${r.id} ${r.name}`.toLocaleLowerCase().includes(q)).sort((a,b)=>{
    const av=a.metrics[metric],bv=b.metrics[metric];
    if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
    return (bv??0)-(av??0)||a.id.localeCompare(b.id);
  });
}
export function territoriesCSV(data,rows){
  const keys=Object.keys(data.metrics),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const headers=['NTA2020','nombre','borough','tipo',...keys.flatMap(k=>[k,k+'_estado',k+'_margen_error',k+'_umbral',k+'_comparable',k+'_periodo'])];
  return '\ufeff'+[headers,...rows.map(r=>[r.id,r.name,r.borough,r.typeLabel,...keys.flatMap(k=>[r.metrics[k],r.quality[k].status,r.quality[k].marginOfError,r.quality[k].codingThreshold,r.quality[k].comparable,data.metrics[k].period])])].map(row=>row.map(quote).join(',')).join('\r\n');
}
export function territorialPairs(data,x,y){return data.rows.filter(r=>r.residential&&r.quality[x]?.comparable&&r.quality[y]?.comparable&&Number.isFinite(r.metrics[x])&&Number.isFinite(r.metrics[y])).map(r=>({id:r.id,name:r.name,x:r.metrics[x],y:r.metrics[y]}));}
export function mountTerritories({data,container,esc,fmt,onMap,download}){
  if(!data){container.innerHTML='<p class="callout warning">La base NTA no está disponible. No se muestran cifras sustitutas.</p>';return;}
  const state={borough:'all',universe:'residential',query:'',metric:'population'};
  const display=(value,key,quality)=>value===null||!Number.isFinite(value)?'Sin dato':(quality?.codingThreshold==='upper'?'≥ ':quality?.codingThreshold==='lower'?'≤ ':'')+fmt(value,key==='poverty'?1:0);
  container.innerHTML=`<h2>Barrios: base territorial NTA 2020</h2>
    <p>${data.unit.residentialCount} áreas residenciales para comparar y ${data.unit.specialCount} áreas especiales separadas. Población, vivienda e ingresos: ACS 2020–2024. Los registros de servicios y eventos conservan su propio período.</p>
    <div class="controls"><label>Buscar área<input id="nta-search" type="search" placeholder="Nombre o código NTA"></label>
    <label>Borough<select id="nta-borough"><option value="all">Todos</option>${[...new Set(data.rows.map(r=>r.borough))].sort().map(b=>`<option>${esc(b)}</option>`).join('')}</select></label>
    <label>Áreas<select id="nta-universe"><option value="residential">Residenciales</option><option value="special">Especiales</option><option value="all">Todas</option></select></label>
    <label>Ordenar por<select id="nta-metric">${Object.entries(data.metrics).map(([k,m])=>`<option value="${k}">${esc(m.label)}</option>`).join('')}</select></label></div>
    <p id="nta-summary" role="status"></p><p id="nta-metric-note" class="note"></p>
    <button id="nta-download">Descargar selección CSV</button> <a href="/data/territories.json" download>Tabla completa, fuentes y método JSON</a>
    <div id="nta-detail" class="chart-panel" style="margin-top:20px" aria-live="polite"></div>
    <div class="table-wrap"><table><caption>Áreas NTA; orden descriptivo, no ranking de calidad de vida</caption><thead><tr><th>Área</th><th>Borough</th><th id="nta-column">Población</th><th>Calidad / cobertura</th><th>Consultar</th></tr></thead><tbody id="nta-table"></tbody></table></div>
    <details><summary>Cobertura y registros sin asignación territorial</summary><p>Los conteos representan registros de cada fuente dentro del polígono. No miden cobertura de servicio ni ausencia real cuando el valor es cero. Los puntos ambiguos o fuera de las geometrías no se reparten entre barrios.</p><div class="table-wrap"><table><thead><tr><th>Fuente</th><th>Entrada</th><th>Asignados</th><th>Sin coordenadas válidas</th><th>Fuera de polígonos</th><th>Ambiguos</th></tr></thead><tbody>${Object.entries(data.audit).map(([k,a])=>`<tr><td>${esc(data.sources[k].name)}</td>${['input','assigned','invalid','outside','ambiguous'].map(f=>`<td>${fmt(a[f])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  const $=s=>container.querySelector(s);let filtered=[],selected=null;
  function detail(row){selected=row;$('#nta-detail').innerHTML=`<h3>${esc(row.name)} · ${esc(row.id)}</h3><p>${esc(row.borough)} · ${esc(row.typeLabel)}</p><button id="nta-open-map">Ver área en el gemelo</button><div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Margen de error ±</th><th>Período</th><th>Fuente y calidad</th></tr></thead><tbody>${Object.entries(data.metrics).map(([k,m])=>{const q=row.quality[k],source=data.sources[m.source];return `<tr><td>${esc(m.label)}</td><td>${display(row.metrics[k],k,q)} ${row.metrics[k]===null?'':esc(m.unit)}</td><td>${q.marginOfError==null?'No aplica / no publicado':display(q.marginOfError,k)}</td><td>${esc(m.period)}</td><td><a href="${esc(m.source==='ntaDemographics'&&row.demographicSource?row.demographicSource.url:source.source)}" target="_blank" rel="noopener">${esc(source.name)}</a><br>${esc(statusLabels[q.status]||q.status)}<br><small>${esc(q.reason)}</small></td></tr>`;}).join('')}</tbody></table></div><p class="note">No se imputan cifras del borough. Denuncias, total de colisiones, 311, árboles y empresas todavía no tienen desglose NTA en los archivos locales. Las medianas no se suman. Una estimación con fiabilidad baja o limitada por umbral requiere revisión antes de compararla.</p>`;
    $('#nta-open-map').onclick=()=>onMap(row.id);
  }
  function render(){filtered=selectTerritories(data,state);const m=data.metrics[state.metric];
    $('#nta-summary').textContent=`${filtered.length} áreas · ${filtered.filter(r=>r.metrics[state.metric]!==null).length} con dato para el indicador seleccionado`;
    $('#nta-column').textContent=m.label+' · '+m.unit;
    $('#nta-metric-note').textContent=m.period+' · '+(m.method||'Estimaciones ACS con margen de error; no constituyen un conteo censal.');
    $('#nta-table').innerHTML=filtered.map(r=>`<tr><td>${esc(r.name)}<br><small>${esc(r.id)} · ${esc(r.typeLabel)}</small></td><td>${esc(r.borough)}</td><td>${display(r.metrics[state.metric],state.metric,r.quality[state.metric])}</td><td>${esc(statusLabels[r.quality[state.metric].status])}</td><td><button data-nta-detail="${r.id}" aria-label="Ficha de ${esc(r.name)}">Ficha</button></td></tr>`).join('')||'<tr><td colspan="5">No hay áreas que coincidan.</td></tr>';
    if(filtered.length)detail(filtered.find(r=>r.id===selected?.id)||filtered[0]);else {selected=null;$('#nta-detail').textContent='Selecciona otra búsqueda para consultar una ficha.';}
  }
  for(const [id,key,event] of [['nta-search','query','input'],['nta-borough','borough','change'],['nta-universe','universe','change'],['nta-metric','metric','change']])$('#'+id).addEventListener(event,e=>{state[key]=e.target.value;render();});
  $('#nta-table').onclick=e=>{const button=e.target.closest('[data-nta-detail]');if(button)detail(data.rows.find(r=>r.id===button.dataset.ntaDetail));};
  $('#nta-download').onclick=()=>download('cerebro-nyc-nta2020.csv',territoriesCSV(data,filtered),'text/csv;charset=utf-8');
  render();
}
