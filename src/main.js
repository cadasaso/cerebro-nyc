import './style.css';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { createIcons, CircleDot, Mountain, Users, DollarSign, Plane, Landmark, TriangleAlert, Music2, TrendingUp, Grid2x2, CloudSun, MessagesSquare, List, Search, Play, Database, Menu, X, ArrowLeftRight, Copy, Map as MapIcon, MapPin, ExternalLink, Download, Satellite, Crosshair, Share2, Maximize } from 'lucide';
import { boroughs, city, places, manualSources, censusSource, tourismSource, budgetSource, config, historicalPopulation, raceEthnicity, tourismSeries, budgetSeries, airQualityData } from './seed.js';
import { normalize, correlation, sum, median } from './math.js';
import { mountTerritories } from './territories.js';
import { mountComposite, mountRelations } from './atlas-composite.js';
import { mountExcelViews } from './excel-views.js';
import { mountUrban } from './urban-diagnostic.js';
import { mountOutcomes } from './outcomes.js';
let urbanState=null;

echarts.use([BarChart,LineChart,PieChart,ScatterChart,GridComponent,LegendComponent,TooltipComponent,SVGRenderer]);
const icons={CircleDot,Mountain,Users,DollarSign,Plane,Landmark,TriangleAlert,Music2,TrendingUp,Grid2x2,CloudSun,MessagesSquare,List,Search,Play,Database,Menu,X,ArrowLeftRight,Copy,Map:MapIcon,MapPin,ExternalLink,Download,Satellite,Crosshair,Share2,Maximize};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(n,d=0)=>Number.isFinite(Number(n))?Number(n).toLocaleString('es-CO',{maximumFractionDigits:d,minimumFractionDigits:d}):'Sin dato';
const compact=n=>Number(n).toLocaleString('es-CO',{notation:'compact',maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=[['panorama','Panorama','circle-dot'],['gemelo','Gemelo 3D','mountain'],['gente','Gente','users'],['economia','Economía y vivienda','dollar-sign'],['turismo','Turismo','plane'],['municipio','Municipio','landmark'],['seguridad','Seguridad','triangle-alert'],['cultura','Territorio y cultura','music-2'],['correlaciones','Correlaciones','trending-up'],['atlas','Atlas territorial','grid-2x2'],['ambiente','Ambiente y satélite','cloud-sun'],['escucha','Escucha social','messages-square'],['fuentes','Fuentes','list']];
$('#navigation').innerHTML=sections.map(([id,label,icon])=>`<a href="#${id}" aria-label="${esc(label)}" title="${esc(label)}"><i data-lucide="${icon}"></i><span class="nav-label">${esc(label)}</span></a>`).join('');

// Compact sidebar can expand on hover/focus, or remain open when pinned.
// Presentation and section navigation are intentionally unchanged.
const sidebarNode = document.querySelector('#sidebar');
const sidebarActions = sidebarNode?.querySelector('.sidebar-bottom');
if (sidebarNode && sidebarActions && !sidebarNode.querySelector('#sidebar-pin')) {
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.id = 'sidebar-pin';
  pin.className = 'sidebar-pin';
  pin.setAttribute('aria-label', 'Fijar menú expandido');
  pin.setAttribute('aria-pressed', 'false');
  pin.title = 'Fijar menú expandido';
  pin.innerHTML = '<span class="sidebar-pin-symbol" aria-hidden="true">⇤</span><span class="sidebar-pin-caption">Fijar menú</span>';
  sidebarActions.prepend(pin);
  pin.addEventListener('click', () => {
    const isPinned = sidebarNode.classList.toggle('is-pinned');
    pin.setAttribute('aria-pressed', String(isPinned));
    pin.setAttribute('aria-label', isPinned ? 'Desfijar menú expandido' : 'Fijar menú expandido');
    pin.title = isPinned ? 'Desfijar menú expandido' : 'Fijar menú expandido';
    pin.querySelector('.sidebar-pin-caption').textContent = isPinned ? 'Desfijar menú' : 'Fijar menú';
    if (!isPinned) pin.blur();
  });
}

const palette=['#ff8a5b','#80dcd0','#85bde5','#e4ca72','#bdabd8'];
const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
let D={},catalog=[],charts=new Map(),mapApi=null,weights=[20,20,20],primary='Manhattan',comparison='Brooklyn',currentSection='panorama';
const chartTasks=new Map();
let sourceItems={};
let sourceIdsByKey=new Map();
const derivedSourceIds={territories:'F02 + ACS NTA',urbanDiagnostic:'F03 + F11 + F15',urbanBuildings:'F03',urbanEnergy:'F15',sourceUsage:'F29',censusApi:'F19'};
function sourceIdLabel(key){return sourceIdsByKey.get(key)?.join(' / ')||derivedSourceIds[key]||'ID derivado';}
function latestVerifiedDate(){
  const dates=[...catalog.map(s=>s.tested),...(D.sourceUsage?.rows||[]).map(r=>r.lastRetrieved?.slice(0,10)),D.sourceUsage?.generatedAt?.slice(0,10)].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||''));
  return dates.sort().at(-1)||D.catalog.tested;
}
function sourceLink(key,label){const s=catalog.find(s=>s.key===key);return `<button class="source" data-source="${key}" style="border:0;background:none;padding:0;min-height:22px;justify-content:flex-start;text-align:left">${esc(label||`${sourceIdLabel(key)} · ${s?.agency||'Fuente'} · ${s?.period||''}`)} ↗</button>`;}
function metric(value,label,unit='',key='census',period='ACS 2020–2024',detail=''){
  const id='m'+Object.keys(sourceItems).length;sourceItems[id]={key,label,value,unit,period,detail};
  const agency=catalog.find(s=>s.key===key)?.agency||'Cerebro NYC';
  return `<button class="metric" data-metric="${id}" aria-label="${esc(label)}: ${esc(value)} ${esc(unit)}. Ver fuente"><span class="value">${value}<span class="unit">${unit}</span></span><span class="label">${label}</span><span class="source">${esc(sourceIdLabel(key))} · ${esc(agency)} · ${period} ↗</span></button>`;
}
function heading(id,title,intro,eyebrow=''){return `<section id="${id}" class="section">${eyebrow?`<span class="eyebrow">${eyebrow}</span>`:''}<h1>${title}</h1><p class="section-intro">${intro}</p>`;}
function chartBox(id,title,sub,key,note='',tall=false){return `<article class="chart-panel"><h2>${title}<small>${sub}</small></h2><div id="${id}" class="chart ${tall?'tall':''}" role="img" aria-label="${esc(title)}"></div>${sourceLink(key)}${note?`<p class="note">${note}</p>`:''}</article>`;}
const options=(selected=primary)=>boroughs.map(b=>`<option ${selected===b.name?'selected':''}>${b.name}</option>`).join('');
const signals=[
  ['Una ciudad de 8,58 millones','La estimación de julio de 2025 es inferior al conteo de 2020. Se mantienen separados el censo decenal, las estimaciones anuales PEP y las encuestas quinquenales ACS.'],
  ['Vivienda: universos incompatibles','El valor mediano de la vivienda propia supera US$ 1 millón en Manhattan. No es un precio de oferta ni una transacción notarial; calcular rentabilidad con alquileres censales introduce sesgos tipológicos.'],
  ['La movilidad se mira desde varios ángulos','Las 496 estaciones MTA (163 accesibles ADA), las colisiones de NYPD y el tiempo de viaje de ACS cuentan historias diferentes. No describen aforo en vivo.'],
  ['Una ciudad conectada con el mundo','El 36,6 % de los residentes nació fuera de Estados Unidos y el 47,7 % habla en casa una lengua distinta del inglés (ACS 2020–2024).'],
  ['65 millones de visitantes en 2025','NYC Tourism + Conventions reporta US$ 55,6 mil millones de gasto directo. El alcance macro es toda la ciudad; el alojamiento se concentra en Manhattan.'],
  ['Cada mapa conserva su cobertura','Los polígonos NTA abarcan la ciudad. El diagnóstico y el gemelo usan nueve celdas de Midtown con inventario consultado completo. Los conteos NTA conservan la muestra histórica.']
];
function render(){
  const requests=sum(D.requests||[],'count'),crashes=sum(D.crashes||[],'count'),injured=sum(D.crashes||[],'injured'),killed=sum(D.crashes||[],'killed'),crime=sum(D.crime||[],'count'),treeTotal=sum(D.trees||[],'count');
  const alive=sum((D.trees||[]).filter(t=>t.status==='Alive'),'count');
  const healthCount=(D.health||[]).length,cultureCount=(D.culture||[]).length;
  const buildingCount=D.urbanDiagnostic?.audit.buildings.assigned??D.buildings?.features.length??0;
  const sourceCount=D.sourceUsage?.rows?.length||catalog.filter(s=>['integrado','verificado'].includes(s.status)).length;
  const latestTest=latestVerifiedDate();
  $('#lake-status').textContent=`lago: ${sourceCount} fuentes registradas`;
  $('#app').innerHTML=`
    <section id="panorama" class="section hero">
      <div class="hero-stage">
        <div class="hero-copy">
          <span class="eyebrow">NUEVA YORK · 5 BOROUGHS · FOCO MANHATTAN</span>
          <h1 class="hero-title">Entiende una zona.<br><span>Decide con evidencia.</span></h1>
          <p class="hero-stage-caption">Una perspectiva más clara de la ciudad, basada en datos verificables.</p>
        </div>
        <div class="city-visual" aria-label="Ilustración animada de cerebro, símbolo de inteligencia urbana">
          <div class="brain-art" aria-hidden="true">
            <svg class="brain-art-svg" viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" focusable="false">
              <defs>
                <linearGradient id="brainArtFill" x1=".12" y1="0" x2=".92" y2="1">
                  <stop offset="0" stop-color="#b6f3ff" stop-opacity=".15"/>
                  <stop offset=".6" stop-color="#68bce9" stop-opacity=".09"/>
                  <stop offset="1" stop-color="#8abfff" stop-opacity=".20"/>
                </linearGradient>
                <linearGradient id="brainArtLine" x1="0" y1="0" x2="1" y2=".8">
                  <stop offset="0" stop-color="#92eaff"/>
                  <stop offset=".46" stop-color="#d2f9ff"/>
                  <stop offset="1" stop-color="#81c4ff"/>
                </linearGradient>
                <filter id="brainArtGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.7" result="soft"/>
                  <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <g class="brain-art-shape" stroke-linejoin="round" stroke-linecap="round">
                <!-- Distinct lateral silhouette: cerebral cortex, temporal lobe, cerebellum and stem -->
                <path class="brain-art-outline" d="M160 199
                  C143 187 143 159 158 146
                  C153 122 177 101 198 103
                  C207 78 240 73 260 89
                  C278 67 312 68 329 84
                  C352 64 387 78 399 95
                  C431 86 455 110 458 131
                  C480 139 491 159 485 179
                  C504 195 499 222 477 235
                  C487 259 471 277 447 279
                  C429 276 419 265 407 272
                  C383 282 365 296 338 296
                  C316 299 305 287 286 293
                  C256 309 234 306 218 289
                  C188 289 172 272 175 252
                  C149 248 141 226 160 199 Z"
                  fill="url(#brainArtFill)" stroke="url(#brainArtLine)" stroke-width="3.7" />
                <!-- Lower temporal sweep gives a recognizable side view. -->
                <path class="brain-art-detail brain-art-temporal" d="M207 271 C239 266 257 237 286 229 C311 224 321 241 331 257 C347 281 376 274 398 265"
                  fill="none" stroke="#a9edff" stroke-opacity=".7" stroke-width="2.35"/>
                <!-- Brainstem curves downward behind the cerebellum. -->
                <path class="brain-art-stem" d="M327 285
                  C320 313 332 333 342 350
                  C347 360 345 372 351 382
                  L375 380
                  C370 358 365 341 377 326
                  C386 311 386 294 379 280"
                  fill="#31698f" fill-opacity=".40" stroke="#91ddff" stroke-width="2.9" />
                <path class="brain-art-stem-line" d="M350 304 C347 323 354 344 360 361" fill="none" stroke="#c0f4ff" stroke-opacity=".64" stroke-width="1.5" />
                <!-- Cerebellum, located underneath the occipital lobe. -->
                <path class="brain-art-cerebellum" d="M389 275
                  C407 257 435 264 447 281
                  C461 287 463 307 447 319
                  C439 337 408 339 392 327
                  C371 325 361 304 371 288
                  C375 281 382 277 389 275 Z"
                  fill="#4e9bc5" fill-opacity=".19" stroke="#96dfff" stroke-width="3"/>
                <g class="brain-art-cerebellum-lines" fill="none" stroke="#96dfff" stroke-opacity=".69" stroke-width="1.7">
                  <path d="M378 295 C402 282 426 281 451 292"/>
                  <path d="M375 306 C401 296 430 300 453 305"/>
                  <path d="M385 318 C411 312 431 314 445 318"/>
                </g>
                <!-- Simplified gyri, with open curved lines instead of busy network meshes. -->
                <g class="brain-art-folds" fill="none" stroke="#9bdfff" stroke-width="2.7">
                  <path d="M201 108 C219 121 225 143 208 159 C195 170 195 183 208 197"/>
                  <path d="M260 89 C268 108 262 121 244 130 C233 139 236 154 250 166"/>
                  <path d="M325 85 C307 105 303 121 320 138 C338 156 322 175 307 187"/>
                  <path d="M397 97 C385 116 393 131 410 139 C429 150 428 168 417 182"/>
                  <path d="M460 146 C443 160 444 177 458 190 C469 205 452 219 438 224"/>
                  <path d="M163 201 C187 194 202 207 202 225 C203 242 217 250 231 242"/>
                  <path d="M253 181 C271 169 290 178 293 196 C298 211 286 225 272 226"/>
                  <path d="M351 156 C367 172 353 187 364 202 C376 217 389 213 398 204"/>
                  <path d="M322 248 C341 233 356 234 372 245"/>
                </g>
              </g>
</svg>
          </div>
          <div class="visual-card visual-card-a"><span>POBLACIÓN ESTIMADA</span><strong>8,58 M</strong><small>NYC · 2025</small></div>
          <div class="visual-card visual-card-b"><span>VISITANTES</span><strong>65 M</strong><small>NYC · 2025</small></div>
          <div class="visual-coordinate">40° 45′ N &nbsp; 73° 59′ W</div>
        </div>
      </div>
      <p>Nueva York (FIPS 3651000): <strong>${fmt(city.population)} habitantes estimados en 2025</strong> (Censo 2020: ${fmt(city.pop2020)}) · ingreso mediano del hogar <strong>US$ ${fmt(city.income)}</strong> y alquiler mediano <strong>US$ ${fmt(city.rent)}/mes</strong> (ACS 2020–2024) · <strong>65 millones de visitantes</strong> en 2025 · <strong>${fmt(buildingCount)} edificios</strong> en un recorte 3D de Midtown. Un sistema territorial que reúne mapas, gente y relaciones entre datos: cada cifra conserva fuente, vigencia y método.</p>
      <div class="status-row"><span class="tag good">última verificación ${latestTest}</span><span class="tag">${sourceCount} fuentes registradas</span><span class="tag">16 variables cruzables</span><a class="tag" href="#fuentes">ver trazabilidad ↗</a></div>
      <div class="diagnosis" aria-label="Diagnóstico territorial">
        <div class="diagnosis-head"><div><span class="eyebrow">DIAGNÓSTICO TERRITORIAL · 5 BOROUGHS</span><h2>¿Qué ocurre en esta parte de Nueva York?</h2></div><p>Compara densidad de población, actividad económica y colisiones registradas. Cambia la prioridad y observa cómo cambia la lectura.</p></div>
        <div class="controls"><label><span>Zona principal</span><select id="primary" aria-label="Zona principal">${options(primary)}</select></label><button id="swap-boroughs" aria-label="Intercambiar zonas" title="Intercambiar zonas"><i data-lucide="arrow-left-right"></i></button><label><span>Comparar con</span><select id="comparison" aria-label="Zona de comparación">${options(comparison)}</select></label><label class="search-field"><span>O busca un lugar</span><form id="place-search" class="input-group"><input id="place-query" type="search" placeholder="Times Square, Central Park…" aria-label="Buscar un lugar"><button class="primary" type="submit">Buscar en mapa</button></form></label></div>
        <div class="segmented" id="presets"><span>PRIORIDAD:</span>${['Equilibrio','Densificación','Actividad','Movilidad'].map((x,i)=>`<button data-preset="${i}" class="${i===0?'active':''}">${x}</button>`).join('')}</div>
        <div class="reading"><div class="reading-body"><span id="reading-label" class="eyebrow"></span><h3 id="score"></h3><p id="reading-text"></p></div><aside class="rank-summary"><span class="eyebrow">POSICIÓN RELATIVA</span><strong id="rank"></strong><small id="rank-difference"></small><button id="view-primary">Ver en el mapa ↑</button></aside></div>
        <div id="diagnostic-metrics" class="metrics"></div>
        <div class="split"><div><span class="eyebrow">COMPARACIÓN DIRECTA</span><h3 id="compare-title"></h3><div id="compare-chart" class="chart" role="img" aria-label="Comparación normalizada entre boroughs"></div><p class="note">Barras normalizadas 0–100. El indicador no mide calidad de vida, déficit o riesgo.</p></div><div><span class="eyebrow">SENSIBILIDAD DEL ÍNDICE</span><h3>¿La conclusión cambia con la prioridad?</h3><p class="note">Pesos analíticos, no datos observados. Se normalizan automáticamente.</p>${['Densidad poblacional','Actividad empresarial','Colisiones por residente'].map((n,i)=>`<label class="weight-row"><div><span>${n}</span><output id="weight-${i}">33 %</output></div><input type="range" min="0" max="100" value="33" data-weight="${i}" aria-label="Peso de ${n.toLowerCase()}"></label>`).join('')}<div class="ranking" id="diagnostic-ranking"></div></div></div>
        <div class="diagnosis-bottom"><p>Min–max entre 5 boroughs. Población PEP 2025; empresas 2023; colisiones 2025. Una tasa por residente no incluye población flotante ni prueba causalidad.</p><button id="copy-diagnosis"><i data-lucide="copy"></i> Copiar diagnóstico</button></div>
      </div>
      <div class="metrics">${metric(fmt(city.population),'Población estimada','personas','census','PEP 2025')}${metric('5','Boroughs comparables','','boroughs','2026')}${metric(fmt(crashes),'Colisiones registradas','','crashes','2025')}${metric(fmt(D.subway?.length||0),'Registros de estaciones MTA','','subway','corte consultado')}</div>
      <h2>Señales que importan <small>lo que cambia la lectura de la ciudad</small></h2><div class="signal-list">${signals.map(([h,p])=>`<article class="signal"><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>
    </section>
    ${heading('gemelo','Gemelo territorial 3D','Explora Nueva York por preguntas: población, energía, edificación, movilidad, servicios, cultura y zonas verdes. Los límites son oficiales; los edificios 3D usan huellas y alturas de NYC OTI en un recorte de Midtown. Haz clic para consultar el lugar y su entorno.','TERRITORIO REAL · CAPAS ABIERTAS')}
      <div class="map-shell" id="map-shell"><div class="map-canvas" id="territory-map" aria-label="Mapa interactivo de Nueva York"></div>
        <div class="map-toolbar"><button id="toggle-explorer" aria-expanded="true"><i data-lucide="menu"></i> Explorar</button><span class="tag" id="basemap-label">Satélite Esri</span><div class="segmented" aria-label="Lentes principales">${[['urban','Cruce urbano'],['energy','Energía'],['buildings','Edificación'],['mobility','Movilidad']].map(([k,n])=>`<button data-lens="${k}" class="${k==='urban'?'active':''}">${n}</button>`).join('')}</div></div>
        <aside class="map-explorer" id="map-explorer"><h3>Explorador territorial<button id="close-explorer" aria-label="Cerrar panel"><i data-lucide="x"></i></button></h3><small>5 boroughs · ${fmt(D.neighborhoods?.features.length||0)} áreas NTA</small><label class="field-label" for="map-search">BUSCAR LUGAR</label><input id="map-search" type="search" placeholder="Times Square, Brooklyn…" list="map-places"><datalist id="map-places">${[...places.map(p=>p.name),...boroughs.map(b=>b.name)].map(p=>`<option value="${esc(p)}"></option>`).join('')}</datalist>
        <span class="field-label">CAPAS TEMÁTICAS</span><div class="map-categories">${[['subway','Movilidad'],['health','Servicios'],['places','Turismo'],['parks','Verde'],['neighborhoods','Planificación'],['buildings','Edificación 3D'],['culture','Cultura']].map(([k,n])=>`<button data-layer-toggle="${k}" aria-pressed="${k==='buildings'}">${n}</button>`).join('')}</div>
        <details open><summary>Mapa base</summary><label><input type="radio" name="basemap" value="satellite" checked> Satélite Esri</label><label><input type="radio" name="basemap" value="streets"> Calles OpenStreetMap</label><label><input type="radio" name="basemap" value="plain"> Solo capas de datos</label></details>
        <details><summary>Capas de datos</summary>${[['boroughs','Boroughs'],['neighborhoods','Áreas NTA 2020'],['subway','Estaciones MTA'],['parks','Propiedades Parks'],['health','Centros H+H'],['culture','Organizaciones DCLA'],['energy','Energía LL84 2023'],['places','Hitos urbanos'],['buildings','Edificios OTI · Midtown']].map(([k,n])=>`<label><input type="checkbox" data-layer-check="${k}" ${['boroughs','buildings'].includes(k)?'checked':''}>${n}</label>`).join('')}</details>
        <div class="map-categories"><button id="analyze-point" aria-pressed="true"><i data-lucide="crosshair"></i> Analizar punto</button><button id="share-map"><i data-lucide="share-2"></i> Compartir</button><button id="toggle-3d" aria-pressed="true">3D</button><button id="map-fullscreen"><i data-lucide="maximize"></i> Pantalla</button><button id="reset-map">Restablecer</button><button id="view-city">Toda la ciudad</button></div><p class="note" style="margin-top:14px">Alturas de edificio: dato de OTI en pies, convertido a metros. El recorte no cubre toda la ciudad. Los radios de 500 m y 1 km miden distancia en línea recta.</p></aside>
        <div class="map-summary" id="map-summary"><strong>Midtown Manhattan</strong><br>${fmt(buildingCount)} huellas en el recorte · edificios con altura válida en 3D.</div><div class="map-status" id="map-status">Preparando cartografía…</div>
      </div><div class="tour-buttons"><span class="note">RECORRIDO</span>${places.slice(0,6).map((p,i)=>`<button data-place="${i}">${p.name}</button>`).join('')}</div>
    </section>
    ${heading('gente','Gente','Quiénes viven en Nueva York, cómo se distribuyen y cómo son sus hogares. Las cifras combinan el conteo censal 2020, estimaciones anuales PEP 2025 y la encuesta quinquenal ACS 2020–2024; la vigencia y método se conservan en cada tarjeta. No se publican datos individuales.')}
      <div class="section-bar"><p class="note">Territorio de las tarjetas</p><select id="people-borough" aria-label="Territorio de población"><option value="NYC">Toda Nueva York</option>${options('NYC')}</select></div><div class="metrics" id="people-metrics"></div>
      <div class="split">${chartBox('population-chart','Población por borough','Censo 2010 · Censo 2020 · PEP 2025','census','Las estimaciones PEP no son un nuevo censo.')}${chartBox('age-chart','Estructura por grandes edades','% de población · QuickFacts, corte consultado','census','18–64 años se calcula como 100 menos menores de 18 y mayores de 64.')}${chartBox('demo-history-chart','Evolución censal decenal de NYC','Población censada 1950–2020 y PEP 2025 · U.S. Census Bureau','census','Pérdida demográfica en la crisis de los años 70 y recuperación sostenida hasta el máximo del Censo 2020.')}${chartBox('race-chart','Composición étnico-racial por borough','Censo 2020 / ACS 2020–2024 · % de población residente','census','Categorías oficiales de autodefinición del U.S. Census Bureau.')}${chartBox('foreign-chart','Una ciudad de orígenes diversos','Nacidos fuera de EE. UU. · % · ACS 2020–2024','census')}${chartBox('households-chart','Cómo se habita la ciudad','Personas por hogar · ACS 2020–2024','census')}${chartBox('education-chart','Educación y conexión digital','% · ACS 2020–2024','census','Título universitario: personas de 25+; banda ancha: hogares. Denominadores diferentes.')}${chartBox('gender-chart','Composición por sexo','% femenino publicado en QuickFacts','census','Sexo según la clasificación de la fuente; no es una medición de identidad de género.')}</div>
      <div class="callout"><p><strong>Diferenciación de fuentes demográficas:</strong> Censo 2020 (conteo decenal exhaustivo de 8,80 M), PEP 2025 (estimación anual de componentes demográficos de 8,58 M) y ACS 2020–2024 (encuesta continua por muestreo a hogares) son productos estadísticos con metodologías y coberturas distintas; no deben fusionarse en una única serie sin advertir los cambios de método. La pirámide demográfica oficial por sexo y edad del Censo 2020 está integrada abajo (F31).</p></div>
    </section>
    ${heading('economia','Economía y vivienda','La ciudad no tiene un único mercado de vivienda. Compara ingresos, alquileres, propiedad y actividad empresarial entre boroughs con las mismas definiciones y periodos. Los valores monetarios de ACS están expresados en dólares de 2024.')}
      <div class="metrics">${metric('US$ '+fmt(city.income),'Ingreso mediano del hogar','/año')}${metric('US$ '+fmt(city.rent),'Alquiler bruto mediano','/mes')}${metric('US$ '+fmt(city.homeValue),'Valor mediano de vivienda propia','')}${metric(fmt(city.owner,1),'Hogares propietarios','%')}${metric(fmt(city.poverty,1),'Población bajo el umbral de pobreza','%','census','QuickFacts · corte consultado')}${metric(fmt(sum(boroughs,'companies')),'Establecimientos con empleados','','census','2023')}${metric(fmt(sum(boroughs,'jobs')),'Empleos en establecimientos','','census','2023')}${metric(fmt(city.commute,1),'Tiempo medio al trabajo','min')}</div>
      <div class="split">${chartBox('income-chart','Ingreso mediano del hogar','US$ / año · ACS 2020–2024','census')}${chartBox('rent-chart','Alquiler bruto mediano','US$ / mes · ACS 2020–2024','census')}${chartBox('home-chart','Valor de la vivienda propia','US$ · mediana · ACS 2020–2024','census','No equivale al precio de compraventa actual ni al valor por m².')}${chartBox('tenure-chart','Propietarios e inquilinos','% de viviendas ocupadas · ACS 2020–2024','census')}${chartBox('housing-dist-chart','Comparación territorial de alquileres','Alquiler mediano NTA vs Borough (US$/mes) · ACS 2020–2024','census','Promedio de los alquileres de los barrios residenciales NTA frente a la mediana del borough.')}${chartBox('companies-chart','Establecimientos con empleados','Registros por borough · 2023','census')}${chartBox('commute-chart','El tiempo para llegar al trabajo','Minutos · ACS 2020–2024','census')}</div>
      <div class="callout warning"><p><strong>Diferenciación de universos y mercados inmobiliarios:</strong><br>1) <em>Valores de vivienda:</em> Las cifras censales ACS son estimaciones subjetivas declaradas por los propietarios residentes, no precios de compraventa efectiva (DOF ACRIS) ni precios de oferta de portales (StreetEasy).<br>2) <em>Alquileres:</em> El alquiler bruto mediano ACS incluye suministros básicos y contratos vigentes (incluyendo renta estabilizada), no el precio de alquiler de mercado para contratos nuevos.<br>3) <em>Rentabilidad inmobiliaria (Rental Yield):</em> No es metodológicamente válido calcular una rentabilidad dividiendo el alquiler mediano entre el valor mediano de la vivienda, ya que los universos de inquilinos y propietarios en Nueva York son espacial y tipológicamente incompatibles (los propietarios se concentran en cooperativas/condominios de Manhattan o unifamiliares de Staten Island/Queens, mientras los inquilinos ocupan edificios multifamiliares con marcos regulatorios específicos).</p></div>
    </section>
    ${heading('turismo','Turismo','NYC Tourism + Conventions reportó 65 millones de visitantes en 2025. Los indicadores macro son de toda la ciudad; el mapa permite localizar hitos y el registro sanitario aporta una lectura territorial de la oferta de comida, sin confundir inspecciones con visitas.')}
      <div class="metrics">${metric('65 M','Visitantes en 2025','personas','tourism','2025')}${metric('52,4 M','Visitantes nacionales','','tourism','2025')}${metric('12,6 M','Visitantes internacionales','','tourism','2025')}${metric('US$ 55,6 mil M','Gasto directo de visitantes','','tourism','2025')}${metric('84,2','Ocupación hotelera','%','tourism','2025')}${metric('US$ 334','Tarifa hotelera diaria media','','tourism','2025')}${metric('124.000','Habitaciones hoteleras','aprox.','tourism','2025')}${metric('397.000','Empleos vinculados al turismo','','tourism','2025')}</div>
      <div class="split">${chartBox('tourism-trend-chart','Evolución de visitantes 2019–2025','Millones de personas · Nacionales e internacionales','tourism','Caída abrupta en 2020 (22,3 M) y recuperación sostenida hasta 65,0 M en 2025.')}${chartBox('tourism-occupancy-chart','Ocupación hotelera anual','Tasa de ocupación (%) 2019–2025 · NYC Tourism + Conventions','tourism','Recuperación progresiva del sector hotelero tras la pandemia, alcanzando el 84,2 % en 2025.')}${chartBox('tourism-provenance-chart','Mercados emisores internacionales','Millones de visitantes · 2025 · NYC Tourism + Conventions','tourism','Reino Unido, Canadá y Francia encabezan la procedencia de visitantes extranjeros.')}${chartBox('tourism-chart','Motivo del viaje','Millones de visitantes · 2025','tourism')}${chartBox('restaurants-chart','Oferta de comida registrada','Establecimientos únicos con inspecciones en DOHMH','restaurants','Conteo distinto de CAMIS. Incluye el historial disponible; no es un censo de locales abiertos hoy.')}</div>
      <div class="callout"><p><strong>Alcance territorial:</strong> Las cifras de visitantes, ocupación hotelera y gasto corresponden a TODA LA CIUDAD DE NUEVA YORK. La infraestructura de alojamiento está fuertemente concentrada en Manhattan (>80 % de las habitaciones hoteleras en Midtown y Lower Manhattan). El registro de inspecciones sanitarias de restaurantes (DOHMH) y los hitos seleccionados aportan el análisis desagregado por borough.</p></div>
      <h2>Hitos de Nueva York <small>paradas del recorrido territorial</small></h2><div class="table-wrap"><table><thead><tr><th>Lugar</th><th>Borough</th><th>Tipo</th><th>Mapa</th></tr></thead><tbody>${places.map((p,i)=>`<tr><td><a href="${p.source}" target="_blank" rel="noopener">${p.name} ↗</a></td><td>${p.borough}</td><td>${p.type}</td><td><button data-place="${i}" aria-label="Ver ${p.name} en mapa"><i data-lucide="map-pin"></i></button></td></tr>`).join('')}</tbody></table></div>
    </section>
    ${heading('municipio','Municipio','Capacidad pública y demandas de la ciudad. El presupuesto adoptado FY2026 corresponde al acuerdo de junio de 2025; se muestra como corte histórico, no como presupuesto vigente ni como ejecución. Las solicitudes 311 describen trámites y reportes ciudadanos, no personas únicas.')}
      <div class="metrics">${metric('US$ 115,91 mil M','Presupuesto adoptado de gastos','','budget','FY2026')}${metric('US$ 24,28 mil M','Presupuesto de capital adoptado','','budget','FY2026')}${metric('304.752','Puestos autorizados a tiempo completo','','budget','FY2026')}${metric(fmt(sum(D.requestMonths||[],'count')),'Solicitudes 311 recibidas','','requestMonths','2025')}</div>
      <div class="split">${chartBox('budget-trend-chart','Evolución presupuestaria: Adoptado, Modificado y Ejecutado','Miles de millones de US$ · FY2022–FY2026 · NYC Comptroller / OMB','budget','Adoptado en junio previo; Modificado por revisiones fiscales; Ejecutado según auditoría ACFR del Contralor. FY2026 en curso.')}${chartBox('budget-capital-chart','Compromisos de presupuesto de capital por sector','Miles de millones de US$ · FY2026 adoptado · US$ 24,28 mil M total','budget','Educación y transporte concentran más del 40 % de la inversión física de la ciudad.')}${chartBox('budget-chart','Fuentes de financiación','Millones de US$ · FY2026 adoptado','budget','Fondos de la ciudad 87.527; estado 18.980; federación 7.470; otras subvenciones 1.125; transferencias 805.')}${chartBox('requests-month-chart','Pulso mensual de atención 311','Solicitudes registradas · 2025','requestMonths')}</div>
      <div class="callout"><p><strong>Distinción temporal y conceptual:</strong> El Año Fiscal de NYC (Fiscal Year) rige del 1 de julio al 30 de junio (ej. FY2026: 1 jul 2025 – 30 jun 2026), a diferencia del año calendario. Las solicitudes ciudadanas 311 representan solicitudes operativas y quejas vecinales tramitadas, y no constituyen una medición de ejecución presupuestaria ni de gasto público.</p></div>
      <div class="link-list"><a href="https://www.nyc.gov/content/omb/pages/publications/fy2026-adopted-budget" target="_blank" rel="noopener">Documentos presupuestarios OMB <i data-lucide="external-link"></i></a><a href="https://comptroller.nyc.gov/" target="_blank" rel="noopener">Contraloría de Nueva York <i data-lucide="external-link"></i></a><a href="https://portal.311.nyc.gov/" target="_blank" rel="noopener">Servicios y solicitudes NYC 311 <i data-lucide="external-link"></i></a></div>
    </section>
    ${heading('seguridad','Seguridad','Se separan las denuncias policiales del histórico NYPD (2024) y las colisiones de tránsito (2025). Son registros administrativos: no miden toda la victimización, no equivalen a condenas y no describen el riesgo individual de una persona.')}
      <div class="metrics">${metric(fmt(crime),'Denuncias en el histórico consultado','','crime','2024')}${metric(fmt(crashes),'Colisiones de tránsito','','crashes','2025')}${metric(fmt(injured),'Personas lesionadas en colisiones','','crashes','2025')}${metric(fmt(killed),'Personas fallecidas en colisiones','','crashes','2025')}</div>
      <div class="split">${chartBox('crime-chart','Denuncias por borough','Registros administrativos · 2024','crime')}${chartBox('crime-type-chart','Tipos de denuncia más frecuentes','Top 8 · NYC · 2024','crime','Categorías originales de NYPD.',true)}${chartBox('crash-chart','Colisiones por mes','NYPD · 2025 · incluye borough no informado','crashes')}${chartBox('crash-rate-chart','Colisiones por 10.000 residentes','Colisiones 2025 / PEP 2025 × 10.000','crashes','Solo registros con borough conocido. No controla visitantes ni kilómetros recorridos.')}</div>
      <button class="primary" id="show-security-map"><i data-lucide="map"></i> Ver tasas agregadas por borough</button><p class="note" style="margin-top:10px">Las colisiones se publican únicamente como totales mensuales y agregados por borough. No publicamos identificadores, fechas exactas ni coordenadas de eventos.</p>
    </section>
    ${heading('cultura','Territorio y cultura','La ciudad también se entiende por sus equipamientos, parques, estaciones e instituciones culturales. Las capas preservan las geometrías oficiales y su cobertura: un directorio administrativo no garantiza una lista exhaustiva ni la apertura actual de cada lugar.')}
      <div class="metrics">${metric(fmt(cultureCount),'Organizaciones culturales DCLA','','culture','corte consultado')}${metric(fmt(healthCount),'Centros de la red municipal H+H','','health','corte consultado')}${metric(fmt(D.parks?.features.length||0),'Propiedades administradas por Parks','','parks','corte consultado')}${metric(fmt(buildingCount),'Huellas de nueve celdas Midtown','','urbanBuildings','corte consultado')}</div>
      <div class="split">${chartBox('culture-chart','Organizaciones culturales por borough','Directorio DCLA','culture')}${chartBox('subway-chart','Estaciones y accesibilidad ADA','Clasificación MTA: ADA 1 (completa), ADA 2 (parcial), ADA 0 (no accesible)','subway','496 registros MTA en 5 boroughs: 163 accesibles, 9 parciales, 324 no accesibles. Un complejo puede tener varios registros.')}${chartBox('height-chart','Alturas de los edificios del recorte','Metros · height_roof × 0,3048','urbanBuildings','Solo alturas positivas publicadas; no se imputan pisos ni alturas.')}${chartBox('parks-chart','Propiedades administradas por NYC Parks','Número de parcelas inventariadas por borough','parks','Incluye parques, plazas, jardines comunitarios, playas e instalaciones recreativas. Mide conteo de parcelas registradas, no superficie verde continua ni canopia arbórea.')}</div>
      <article class="chart-panel"><h2>Marco de zonificación de Nueva York<small>Zoning Resolution · NYC DCP</small></h2><p class="note">La ciudad regula el suelo en tres distritos principales: Residencial (R1 a R10, densidad baja a alta), Comercial (C1 a C8, desde comercio de proximidad hasta distritos centrales) y Manufacturero (M1 a M3, industrial ligero a pesado), complementados por distritos de propósito especial (Special Midtown District, Special Hudson Yards) y programas de Vivienda Obligatoria Inclusiva (MIH). Los límites y edificaciones 3D se visualizan en el Gemelo Territorial.</p></article>
      <div class="chart-panel"><h2>Instituciones en el territorio<small id="culture-count-label">Directorio DCLA</small></h2><div class="controls"><input id="culture-filter" type="search" placeholder="Buscar institución o dirección…" aria-label="Buscar institución cultural"><select id="culture-borough-filter" aria-label="Filtrar por borough"><option value="all">Todos los boroughs</option>${options('all')}</select></div><p id="culture-result-summary" class="note"></p><div id="culture-directory" class="link-list"></div><div id="culture-pagination" class="pagination-controls" style="margin-top:12px;display:flex;gap:8px;align-items:center"></div></div>
    </section>
    ${heading('correlaciones','Correlaciones','Cruza 16 variables trazables de los cinco boroughs. El gráfico conserva los valores originales y calcula Pearson o Spearman sobre casos completos. Con solo cinco observaciones, una correlación es exploratoria: no demuestra causalidad ni permite generalizar a barrios o personas.','LECTURA CRUZADA · CINCO OBSERVACIONES')}
      <div class="chart-panel"><h2>Explorador de relaciones<small>elige dos variables · Manhattan en coral</small></h2><div class="segmented" id="correlation-presets"><button data-pair="income,poverty" class="active">Ingreso y pobreza</button><button data-pair="density,rent">Densidad y alquiler</button><button data-pair="companies,crime">Actividad y denuncias</button><button data-pair="foreign,language">Migración y lengua</button></div><div class="controls"><label><span>Eje horizontal</span><select id="axis-x" aria-label="Eje horizontal"></select></label><button id="swap-axes" title="Intercambiar ejes" aria-label="Intercambiar ejes"><i data-lucide="arrow-left-right"></i></button><label><span>Eje vertical</span><select id="axis-y" aria-label="Eje vertical"></select></label><label><span>Método</span><select id="correlation-method"><option value="spearman">Spearman</option><option value="pearson">Pearson</option></select></label></div><div id="scatter-chart" class="chart tall" role="img" aria-label="Gráfico de dispersión"></div><div class="correlation-result"><div><span class="eyebrow" id="correlation-label">SPEARMAN</span><strong id="correlation-value"></strong></div><p id="correlation-description"></p></div><div id="correlation-sources" class="split" style="margin-top:25px"></div></div>
    </section>
    ${heading('atlas','Atlas territorial de Nueva York','Cinco territorios, distintas escalas. El atlas combina población, vivienda, actividad, servicios y movilidad sin convertir las diferencias en una clasificación de “mejor” o “peor”. Selecciona una métrica para ordenar la tabla y colorear los polígonos oficiales.')}
      <div class="variable-buttons" id="atlas-metrics"></div><div class="split"><article class="chart-panel"><h2 id="atlas-title">Densidad de población</h2><div id="atlas-map" class="mini-map" aria-label="Mapa coroplético de los boroughs"></div><p class="note" id="atlas-legend"></p></article><article class="chart-panel"><h2>Ranking territorial<small id="atlas-unit"></small></h2><div id="atlas-ranking" class="ranking"></div><div id="atlas-detail" class="atlas-detail"></div><p class="note">Los boroughs no equivalen a los distritos de Lima. Las 262 áreas NTA son unidades estadísticas; no se les asignan los promedios del borough como si fueran datos del barrio.</p></article></div>
      <div class="table-wrap"><table><thead><tr><th>Borough</th><th>Población 2025</th><th>Hab./km²</th><th>Ingreso del hogar</th><th>Alquiler / mes</th><th>Fuente</th></tr></thead><tbody>${boroughs.map(b=>`<tr data-borough="${b.name}"><td><strong>${b.name}</strong></td><td>${fmt(b.population)}</td><td>${fmt(b.density)}</td><td>US$ ${fmt(b.income)}</td><td>US$ ${fmt(b.rent)}</td><td><a href="${b.source}" target="_blank" rel="noopener" aria-label="Fuente de ${b.name}">Census ↗</a></td></tr>`).join('')}</tbody></table></div>
    </section>
    ${heading('ambiente','Ambiente y satélite','Vegetación urbana, tiempo atmosférico y lectura aérea del territorio. El censo de árboles corresponde a 2015 y se conserva como línea de base, no como inventario actual. El pronóstico se consulta al abrir la página y es un resultado de modelo, no una estación en vivo.')}
      <div class="metrics">${metric(fmt(treeTotal),'Registros del censo de árboles','','trees','2015')}${metric(fmt(alive),'Árboles vivos registrados','','trees','2015')}${metric(fmt(sum((D.trees||[]).filter(t=>t.health==='Good'),'count')),'Árboles con salud buena','','trees','2015')}<button class="metric" data-source="weather"><span class="value" id="weather-value">…</span><span class="label">Temperatura modelada · Manhattan</span><span class="source" id="weather-time">Open-Meteo · consultando</span></button></div>
      <div class="split">${chartBox('trees-chart','Arbolado de calle por borough','Registros del Street Tree Census · 2015','trees','Incluye vivos, muertos y tocones; no incluye todos los árboles de parques.')}${chartBox('tree-health-chart','Salud de los árboles vivos','Good · Fair · Poor · 2015','trees')}${chartBox('air-quality-chart','Calidad del aire urbano: contaminantes clave','Concentración observada · NYCCAS / DOHMH','climate','PM2.5 ha caído 40 % desde 2009 gracias a la eliminación del fuelóleo pesado por LL43/LL97.')}${chartBox('forecast-chart','Pronóstico de siete días','Temperatura máxima y mínima · °C','weather','Modelo meteorológico. Sin garantía de observación local.')}${chartBox('rain-chart','Precipitación prevista','Milímetros por día','weather')}</div>
      <article class="chart-panel"><h2>Riesgos climáticos pertinentes para Nueva York<small>NPCC (NYC Panel on Climate Change) / NYC Emergency Management</small></h2><div class="table-wrap"><table><thead><tr><th>Amenaza climática</th><th>Áreas de mayor exposición en NYC</th><th>Medidas de resiliencia</th></tr></thead><tbody>${airQualityData.climateRisks.map(r=>`<tr><td><strong>${esc(r.hazard)}</strong></td><td>${esc(r.exposure)}</td><td>${esc(r.response)}</td></tr>`).join('')}</tbody></table></div><p class="note">Riesgos climáticos evaluados por el panel científico NPCC; las zonas de inundación costera FEMA 100/500 años delimitan la vulnerabilidad hidrológica.</p></article>
      <div class="callout"><p><strong>Documentación de fuentes espaciales y atmosféricas:</strong><br>1) <em>Satélite Esri World Imagery:</em> Mosaico multifecha de resolución submétrica (15–30 cm en áreas urbanas) compuesto por tomas aéreas y satelitales (Maxar/USGS) entre 2021 y 2024 con cobertura de nubes <10 %. No es una observación de hoy.<br>2) <em>Pronóstico atmosférico:</em> Salida del modelo numérico Open-Meteo (GFS/ECMWF), no medición directa de estación local.<br>3) <em>Clima histórico (2015–2025):</em> Reanálisis horario ERA5 centrado en coordenadas de Manhattan (40.758 N, 73.9855 W); los valores nulos se tratan estrictamente como datos ausentes y no como precipitación cero.</p></div><button id="show-satellite" class="primary"><i data-lucide="satellite"></i> Explorar satélite y parques</button>
    </section>
    ${heading('escucha','Escucha social','Qué reporta la ciudad a sus servicios públicos. Aquí se usa NYC 311 como señal de demanda ciudadana, no como encuesta de opinión ni como análisis de redes sociales. Una persona puede crear varios reportes y la propensión a reportar varía entre zonas.')}
      <div class="metrics">${metric(fmt(requests||sum(D.requestMonths||[],'count')),'Solicitudes ciudadanas 311','','requests','2025')}${metric(fmt(new Set((D.requests||[]).map(r=>r.complaint_type)).size),'Temas en la consulta','','requests','2025')}${metric('5','Boroughs comparados','','boroughs','2026')}${metric('0','Identidades de residentes publicadas','','requests','solo agregados')}</div>
      <div class="chart-tabs"><label for="requests-borough">Territorio</label><select id="requests-borough"><option value="NYC">Toda Nueva York</option>${options('NYC')}</select></div>
      <div class="split">${chartBox('requests-topic-chart','Los temas que movilizan reportes','Top 10 · etiquetas originales del registro','requests','No es un ranking de gravedad.',true)}${chartBox('requests-borough-chart','Demanda por borough','Solicitudes 311 por 1.000 residentes','requests','Denominador PEP 2025. Se excluyen los reportes sin borough conocido.')}</div><div class="callout warning"><p>No se inventan titulares, sentimientos ni menciones en redes. Esta adaptación utiliza un registro público verificable de escucha ciudadana; el alcance es distinto del módulo de prensa y Wikipedia del ejemplo.</p></div>
    </section>
    ${heading('fuentes','Fuentes y método','Cada cifra tiene entidad, periodo y fecha de consulta. Las consultas geográficas y administrativas se guardan como cortes reproducibles; las tablas publicadas se identifican como transcripción. Lo que no pudo obtenerse también aparece en el catálogo.','TRAZABILIDAD · COBERTURA · LÍMITES')}
      <div class="controls"><label><span>Buscar fuente</span><input id="source-filter" type="search" placeholder="Census, NYPD, árboles…"></label><label><span>Tema</span><select id="source-theme"><option value="all">Todos los temas</option>${[...new Set(catalog.map(s=>s.theme))].sort().map(t=>`<option>${t}</option>`).join('')}</select></label></div><p id="source-count" class="dataset-count"></p><div class="table-wrap"><table class="source-table"><thead><tr><th>Fuente / entidad</th><th>Tema</th><th>Vigencia</th><th>Estado</th><th>Registros</th><th>Ver</th></tr></thead><tbody id="source-table"></tbody></table></div>
      <div class="source-actions"><button id="download-catalog"><i data-lucide="download"></i> Descargar catálogo</button><button id="download-data"><i data-lucide="download"></i> Datos comparables CSV</button><a href="/data/catalog.json" target="_blank" class="source">Consultas reproducibles JSON ↗</a></div>
      <article class="submission-panel"><span class="eyebrow">ENTREGA ACADÉMICA · TALLER DE DATOS</span><h2>Integrantes y preguntas del sistema</h2><p><strong>Integrantes:</strong> Carlos David Sanchez Soto · Alejandro Garcia Cortes</p><p><a href="/trazabilidad.html" target="_blank">Ver auditoría completa de clics F01–F33 ↗</a></p><div class="question-status"><div><span class="status-label">RESPONDIDA</span><p>¿Cómo varían la población, la vivienda y la actividad económica entre los cinco boroughs? La respondemos en Gente, Economía y Atlas con F19, F31 y la base NTA.</p></div><div><span class="status-label">RESPONDIDA</span><p>¿Dónde se concentran los servicios, la infraestructura y los registros de seguridad y ambiente? La respondemos con el Gemelo, Atlas, Cultura, Seguridad y Ambiente usando agregados territoriales.</p></div><div><span class="status-label unavailable">RESPONDIDA CON LÍMITES</span><p>¿Cómo cambian los reportes ciudadanos y la atención pública hacia Nueva York? Mostramos 311, prensa y Wikipedia; incorporamos cierres administrativos de diciembre de 2025 y satisfacción de respuestas 2025 en vistas separadas con sus denominadores (F34–F35).</p></div></div></article>
      <div class="method-grid"><div><h3>01 · Fuentes y vigencia</h3><p>NYC Open Data y MTA mediante SODA. Census, turismo y presupuesto mediante tablas públicas. No mezclamos conteos de 2020 con estimaciones de 2025 sin indicarlo.</p></div><div><h3>02 · Transformaciones</h3><p>Unimos por borough o NTA. Calculamos tasas por residente, convertimos pies a metros y millas cuadradas a km². No imputamos faltantes.</p></div><div><h3>03 · Protección y privacidad</h3><p>Publicamos población y seguridad de forma agregada. Eliminamos del despliegue los IDs, fechas exactas y coordenadas de colisiones; tampoco incluimos teléfonos ni identidades de residentes.</p></div><div><h3>04 · Cobertura</h3><p>Diagnóstico y gemelo: nueve celdas interiores de Midtown. Conteos NTA: muestra histórica de 10.000 huellas. Árboles: censo 2015. Directorios: corte consultado. Imágenes satelitales: fecha variable.</p></div><div><h3>05 · Límites analíticos</h3><p>Cinco observaciones no bastan para inferencia causal. Los reportes 311 y las denuncias son registros de actividad, no encuestas representativas ni medidas de riesgo personal.</p></div><div><h3>06 · Adaptación del taller</h3><p>La estructura visual sigue Cerebro Lima. El gobierno territorial y las fuentes cambian con la ciudad. <a href="/metodo.html" target="_blank">Ver contrato de datos y bitácora ↗</a></p></div></div>
    </section>`;
  createIcons({icons});
}

const variables={
  income:{label:'Ingreso mediano del hogar',unit:'US$ / año',period:'ACS 2020–2024',source:'census'},
  poverty:{label:'Población en pobreza',unit:'%',period:'QuickFacts, corte consultado',source:'census'},
  density:{label:'Densidad de población',unit:'hab./km²',period:'PEP 2025 / área terrestre 2020',source:'census'},
  population:{label:'Población estimada',unit:'personas',period:'PEP 2025',source:'census'},
  rent:{label:'Alquiler bruto mediano',unit:'US$ / mes',period:'ACS 2020–2024',source:'census'},
  homeValue:{label:'Valor mediano de vivienda propia',unit:'US$',period:'ACS 2020–2024',source:'census'},
  foreign:{label:'Nacidos fuera de EE. UU.',unit:'%',period:'ACS 2020–2024',source:'census'},
  language:{label:'Otra lengua en casa',unit:'% de población de 5+',period:'ACS 2020–2024',source:'census'},
  over65:{label:'Población de 65 años o más',unit:'%',period:'QuickFacts, corte consultado',source:'census'},
  degree:{label:'Educación universitaria',unit:'% de población de 25+',period:'ACS 2020–2024',source:'census'},
  owner:{label:'Viviendas ocupadas por propietarios',unit:'%',period:'ACS 2020–2024',source:'census'},
  commute:{label:'Tiempo medio al trabajo',unit:'minutos',period:'ACS 2020–2024',source:'census'},
  companies:{label:'Establecimientos con empleados',unit:'registros',period:'2023',source:'census'},
  crashRate:{label:'Colisiones por residente',unit:'por 10.000 habitantes',period:'2025 / PEP 2025',source:'crashes'},
  crime:{label:'Denuncias policiales',unit:'registros',period:'2024',source:'crime'},
  trees:{label:'Registros de árboles',unit:'registros',period:'2015',source:'trees'}
};
function baseOption(){return {backgroundColor:'transparent',color:palette,textStyle:{fontFamily:'Inter, sans-serif',color:'#a8bbc0'},animationDuration:350,grid:{left:12,right:25,top:42,bottom:15,containLabel:true},tooltip:{trigger:'axis',backgroundColor:'#14272e',borderColor:'#3b5862',textStyle:{color:'#edf4f5'},confine:true},legend:{top:0,textStyle:{color:'#a8bbc0',fontSize:11},itemWidth:12,itemHeight:7},xAxis:{axisLine:{lineStyle:{color:'#334a53'}},axisLabel:{color:'#829ca4',fontSize:11},axisTick:{show:false}},yAxis:{axisLine:{show:false},axisLabel:{color:'#829ca4',fontSize:11},splitLine:{lineStyle:{color:'#233840'}}}};}
function plot(id,option){
  const el=document.getElementById(id);if(!el)return;
  chartTasks.set(id,option);
  if(!charts.has(id)){const c=echarts.init(el,null,{renderer:'svg'});charts.set(id,c);}
  charts.get(id).setOption({...baseOption(),...option},true);
}
function bars(id,labels,series,horizontal=true,extra={}){
  const base=baseOption();
  plot(id,{...base,xAxis:{...base.xAxis,type:horizontal?'value':'category',...(horizontal?{}:{data:labels}),axisLabel:{...base.xAxis.axisLabel,formatter:horizontal?v=>compact(v):undefined}},yAxis:{...base.yAxis,type:horizontal?'category':'value',...(horizontal?{data:labels,inverse:true}:{}),axisLabel:{...base.yAxis.axisLabel,formatter:horizontal?undefined:v=>compact(v)},splitLine:{show:!horizontal,lineStyle:{color:'#233840'}}},series:series.map((s,i)=>({type:'bar',barMaxWidth:23,name:s.name,data:s.values,itemStyle:{color:s.color||palette[i],borderRadius:horizontal?[0,3,3,0]:[3,3,0,0]},...s})),...extra});
}
function lines(id,labels,series){const b=baseOption();plot(id,{...b,xAxis:{...b.xAxis,type:'category',data:labels},yAxis:{...b.yAxis,type:'value'},series:series.map((s,i)=>({type:'line',name:s.name,data:s.values,smooth:false,symbolSize:6,itemStyle:{color:palette[i]},lineStyle:{width:3},...s}))});}
function donut(id,items){plot(id,{tooltip:{trigger:'item',confine:true,formatter:'{b}: {c} ({d}%)'},legend:{bottom:0,top:undefined,textStyle:{color:'#a8bbc0',fontSize:12}},series:[{type:'pie',radius:['43%','70%'],center:['50%','44%'],label:{color:'#a8bbc0',fontSize:12,formatter:'{b}\n{c}'},data:items.map(([name,value])=>({name,value}))}]});}
function group(items,key,value='count'){const result=new Map();for(const r of items)result.set(r[key]||'No informado',(result.get(r[key]||'No informado')||0)+Number(r[value]||0));return [...result].sort((a,b)=>b[1]-a[1]);}
function enrich(){
  const codes={Manhattan:'M',Bronx:'X',Brooklyn:'B',Queens:'Q','Staten Island':'R'};
  for(const b of boroughs){
    b.crashes=sum((D.crashes||[]).filter(r=>r.borough===b.name.toUpperCase()),'count');
    b.crashRate=b.crashes/b.population*10000;
    b.businessRate=b.companies/b.population*1000;
    b.crime=sum((D.crime||[]).filter(r=>r.boro_nm===b.name.toUpperCase()),'count');
    b.trees=sum((D.trees||[]).filter(r=>r.boroname===b.name),'count');
    b.requests=sum((D.requests||[]).filter(r=>r.borough===b.name.toUpperCase()),'count');
    b.requestRate=b.requests/b.population*1000;
    b.restaurants=sum((D.restaurants||[]).filter(r=>r.boro.toUpperCase()===b.name.toUpperCase()),'count');
    const stationCode={Manhattan:'M',Bronx:'Bx',Brooklyn:'Bk',Queens:'Q','Staten Island':'SI'};
    b.stations=(D.subway||[]).filter(r=>r.borough===stationCode[b.name]).length;
    b.stationsAda=(D.subway||[]).filter(r=>r.borough===stationCode[b.name]&&String(r.ada)==='1').length;
    b.stationsAdaPartial=(D.subway||[]).filter(r=>r.borough===stationCode[b.name]&&String(r.ada)==='2').length;
    b.stationsNotAda=(D.subway||[]).filter(r=>r.borough===stationCode[b.name]&&String(r.ada)==='0').length;
    b.culture=(D.culture||[]).filter(r=>r.borough?.toUpperCase()===b.name.toUpperCase()).length;
    b.parks=(D.parks?.features||[]).filter(r=>r.properties.borough===codes[b.name]).length;
  }
}
function updateDiagnosis(){
  const fields=['density','businessRate','crashRate'];
  const total=weights.reduce((a,b)=>a+b,0),w=total?weights.map(v=>v/total):[1/3,1/3,1/3];
  const ranking=boroughs.map(b=>({b,score:fields.reduce((s,k,i)=>s+normalize(b[k],boroughs.map(v=>v[k]))*w[i],0)})).sort((a,b)=>b.score-a.score);
  const selected=ranking.find(x=>x.b.name===primary),other=ranking.find(x=>x.b.name===comparison);
  const b=selected.b,pos=ranking.indexOf(selected)+1;
  $('#reading-label').textContent=`LECTURA EJECUTIVA · ${primary}`;$('#score').innerHTML=`${fmt(selected.score,1)}<small>/100</small>`;
  $('#reading-text').textContent=`${primary} ocupa la posición ${pos} de 5 con los pesos actuales. Registra ${fmt(b.density)} habitantes por km², ${fmt(b.businessRate,1)} establecimientos por 1.000 residentes y ${fmt(b.crashRate,1)} colisiones por 10.000 residentes. Este índice compara concentración e intensidad registrada, no bienestar ni peligro.`;
  $('#rank').textContent='#'+pos;$('#rank-difference').textContent=`${fmt(Math.abs(selected.score-other.score),1)} puntos ${selected.score>=other.score?'sobre':'bajo'} ${comparison}`;
  $('#diagnostic-metrics').innerHTML=metric(fmt(b.density),'Densidad de población','hab./km²','census','PEP 2025 / área 2020')+metric(fmt(b.businessRate,1),'Actividad empresarial','/1.000 hab.','census','2023 / PEP 2025')+metric(fmt(b.crashRate,1),'Colisiones registradas','/10.000 hab.','crashes','2025 / PEP 2025');
  $$('#diagnostic-metrics [data-metric]').forEach(el=>{sourceItems[el.dataset.metric].territory=primary;});
  $('#compare-title').textContent=`${primary} frente a ${comparison}`;
  bars('compare-chart',['Densidad','Actividad','Colisiones'],[{name:primary,values:fields.map(k=>normalize(b[k],boroughs.map(v=>v[k]))),color:palette[0]},{name:comparison,values:fields.map(k=>normalize(other.b[k],boroughs.map(v=>v[k]))),color:palette[1]}]);
  $('#diagnostic-ranking').innerHTML=ranking.map((x,i)=>`<button data-select-borough="${x.b.name}" class="${primary===x.b.name?'active':''}"><span>#${i+1} ${x.b.name}</span><strong>${fmt(x.score,1)}</strong></button>`).join('');
  w.forEach((v,i)=>$('#weight-'+i).textContent=fmt(v*100)+' %');
}
function updatePeople(){
  const val=$('#people-borough').value,b=val==='NYC'?city:boroughs.find(b=>b.name===val);
  $('#people-metrics').innerHTML=[
    metric(fmt(b.pop2020),'Población censada','personas','census','Censo 2020'),metric(fmt(b.population),'Población estimada','personas','census','PEP 2025'),metric(fmt(b.population/b.area),'Densidad estimada','hab./km²','census','PEP 2025 / área 2020'),metric(fmt(b.over65,1),'Población de 65 años o más','%','census','QuickFacts · corte consultado'),metric(fmt(b.under18,1),'Población menor de 18 años','%','census','QuickFacts · corte consultado'),metric(fmt(b.female,1),'Población femenina','%','census','QuickFacts · corte consultado'),metric(fmt(b.foreign,1),'Nacidos fuera de EE. UU.','%'),metric(fmt(b.households),'Hogares',''),metric(fmt(b.householdSize,2),'Personas por hogar',''),metric(fmt(b.language,1),'Otra lengua en casa (5+)','%'),metric(fmt(b.degree,1),'Universidad completa (25+)','%'),metric(fmt(b.broadband,1),'Hogares con banda ancha','%'),metric(fmt(b.owner,1),'Hogares propietarios','%'),metric(fmt(b.poverty,1),'Población en pobreza','%','census','QuickFacts · corte consultado'),metric('US$ '+fmt(b.income),'Ingreso mediano del hogar','/año'),metric(fmt(b.uninsured,1),'Sin seguro de salud (menores de 65)','%','census','QuickFacts · corte consultado')].join('');
  for(const el of $$('#people-metrics [data-metric]'))sourceItems[el.dataset.metric].territory=val;
}
function renderCharts(){
  const names=boroughs.map(b=>b.name),s=(name,k,color)=>({name,values:boroughs.map(b=>b[k]),color});
  bars('population-chart',names,[s('2010','pop2010',palette[2]),s('2020','pop2020',palette[1]),s('2025','population',palette[0])]);
  bars('age-chart',names,[{...s('Menores de 18','under18'),stack:'age'},{name:'18–64 años',values:boroughs.map(b=>+(100-b.under18-b.over65).toFixed(1)),stack:'age'},{...s('65+','over65'),stack:'age'}]);
  lines('demo-history-chart',historicalPopulation.map(h=>h.year),[
    {name:'Ciudad de Nueva York',values:historicalPopulation.map(h=>h.nyc),color:'#80dcd0',lineStyle:{width:4}},
    {name:'Brooklyn',values:historicalPopulation.map(h=>h.brooklyn),color:palette[0]},
    {name:'Queens',values:historicalPopulation.map(h=>h.queens),color:palette[2]},
    {name:'Manhattan',values:historicalPopulation.map(h=>h.manhattan),color:palette[3]},
    {name:'Bronx',values:historicalPopulation.map(h=>h.bronx),color:palette[4]},
    {name:'Staten Island',values:historicalPopulation.map(h=>h.statenIsland),color:'#bdabd8'}
  ]);
  const raceCats=[
    {name:'Hispano / Latino',key:'hispanic',color:'#ff8a5b'},
    {name:'Blanco no hispano',key:'whiteNonHisp',color:'#80dcd0'},
    {name:'Negro no hispano',key:'blackNonHisp',color:'#85bde5'},
    {name:'Asiático no hispano',key:'asianNonHisp',color:'#e4ca72'},
    {name:'Otros / Multirracial',key:'otherOrMulti',color:'#bdabd8'}
  ];
  const boroList=[...names,'Toda NYC'];
  bars('race-chart',boroList,raceCats.map(cat=>({
    name:cat.name,
    stack:'race',
    color:cat.color,
    values:boroList.map(bName=>bName==='Toda NYC'?raceEthnicity.city[cat.key]:raceEthnicity.boroughs[bName][cat.key])
  })));
  bars('foreign-chart',names,[s('Nacidos fuera de EE. UU.','foreign')]);
  bars('households-chart',names,[s('Personas por hogar','householdSize',palette[1])]);
  bars('education-chart',names,[s('Universidad 25+','degree'),s('Banda ancha','broadband')]);
  bars('gender-chart',names,[s('Población femenina (%)','female',palette[2])]);
  for(const [id,key,label] of [['income-chart','income','US$ / año'],['rent-chart','rent','US$ / mes'],['home-chart','homeValue','US$'],['companies-chart','companies','Establecimientos'],['commute-chart','commute','Minutos']])bars(id,names,[s(label,key)]);
  bars('tenure-chart',names,[{...s('Propietarios','owner'),stack:'tenure'},{name:'Inquilinos',values:boroughs.map(b=>+(100-b.owner).toFixed(1)),stack:'tenure'}]);
  if(D.territories?.rows){
    const res=D.territories.rows.filter(r=>r.residential);
    const boroRents=names.map(bName=>{
      const rents=res.filter(r=>r.borough===bName&&r.metrics.rent).map(r=>r.metrics.rent);
      return rents.length?Math.round(rents.reduce((a,c)=>a+c,0)/rents.length):city.rent;
    });
    bars('housing-dist-chart',names,[
      {name:'Media barrios NTA (US$/mes)',values:boroRents,color:'#80dcd0'},
      {name:'Mediana Borough QuickFacts (US$/mes)',values:boroughs.map(b=>b.rent),color:'#ff8a5b'}
    ]);
  }
  bars('tourism-trend-chart',tourismSeries.years,[
    {name:'Nacionales (millones)',values:tourismSeries.domestic,stack:'tourists',color:'#80dcd0'},
    {name:'Internacionales (millones)',values:tourismSeries.international,stack:'tourists',color:'#ff8a5b'}
  ],false);
  lines('tourism-occupancy-chart',tourismSeries.years,[
    {name:'Ocupación hotelera (%)',values:tourismSeries.occupancy,color:'#80dcd0'}
  ]);
  bars('tourism-provenance-chart',tourismSeries.provenance.map(p=>p.country),[
    {name:'Visitantes (millones)',values:tourismSeries.provenance.map(p=>p.visitors),color:'#85bde5'}
  ]);
  donut('tourism-chart',[['Ocio',52.4],['Negocios',12.6]]);
  bars('restaurants-chart',names,[s('Establecimientos','restaurants')]);
  lines('budget-trend-chart',budgetSeries.years,[
    {name:'Presupuesto Adoptado',values:budgetSeries.adopted,color:'#80dcd0'},
    {name:'Presupuesto Modificado',values:budgetSeries.modified,color:'#e4ca72'},
    {name:'Gasto Ejecutado (ACFR)',values:budgetSeries.actual,color:'#ff8a5b'}
  ]);
  bars('budget-capital-chart',budgetSeries.capitalSectors.map(s=>s.sector),[
    {name:'Compromisos (miles de millones US$)',values:budgetSeries.capitalSectors.map(s=>s.amount),color:'#85bde5'}
  ]);
  donut('budget-chart',[['Ciudad',87527],['Estado',18980],['Federación',7470],['Otros',1125],['Transferencias',805]]);
  lines('requests-month-chart',months,[{
    name:'Solicitudes 311',
    values:months.map((_,i)=>{
      const m=(D.requestMonths||[]).find(r=>+r.month===i+1);
      return m?Number(m.count):null;
    })
  }]);
  bars('crime-chart',names,[s('Denuncias','crime')]);
  const ct=group(D.crime||[],'ofns_desc').slice(0,8);bars('crime-type-chart',ct.map(x=>x[0].length>24?x[0].slice(0,23)+'…':x[0]),[{name:'Denuncias',values:ct.map(x=>x[1]),color:palette[1]}]);
  lines('crash-chart',months,[{
    name:'Colisiones',
    values:months.map((_,i)=>{
      const matching=(D.crashes||[]).filter(r=>+r.month===i+1);
      return matching.length?sum(matching,'count'):null;
    })
  }]);
  bars('crash-rate-chart',names,[s('Por 10.000 hab.','crashRate')]);
  bars('culture-chart',names,[s('Organizaciones','culture',palette[1])]);
  bars('subway-chart',names,[
    {name:'Totalmente accesible (ADA 1)',values:boroughs.map(b=>b.stationsAda),stack:'ada',color:'#80dcd0'},
    {name:'Accesibilidad parcial (ADA 2)',values:boroughs.map(b=>b.stationsAdaPartial),stack:'ada',color:'#e4ca72'},
    {name:'No accesible (ADA 0)',values:boroughs.map(b=>b.stationsNotAda),stack:'ada',color:'#53616b'}
  ]);
  const heights=D.urbanDiagnostic?.buildingHeightsMeters??(D.buildings?.features||[]).map(b=>Number(b.properties.height_roof)*.3048).filter(n=>n>0);
  bars('height-chart',['0–10 m','10–25 m','25–50 m','50–100 m','100+ m'],[{name:'Edificios',values:[[0,10],[10,25],[25,50],[50,100],[100,Infinity]].map(([lo,hi])=>heights.filter(x=>x>=lo&&x<hi).length)}]);
  bars('parks-chart',names,[s('Propiedades','parks',palette[1])]);
  bars('trees-chart',names,[s('Registros','trees',palette[1])]);
  donut('tree-health-chart',['Good','Fair','Poor'].map(h=>[h,sum((D.trees||[]).filter(t=>t.health===h),'count')]));
  bars('air-quality-chart',airQualityData.pollutants.map(p=>p.name),[
    {name:'Concentración observada',values:airQualityData.pollutants.map(p=>p.value),color:'#80dcd0'}
  ]);
  updateRequestCharts();
}

function addSupplementViews(){
  const period=catalog.find(s=>s.key==='requests')?.period||'sin datos';
  const listen=$('#escucha');
  listen.querySelector('.section-intro').textContent='Atención pública, prensa y solicitudes ciudadanas. Las vistas de Wikipedia miden demanda de información; los titulares son una muestra de cobertura periodística; NYC 311 describe reportes a los servicios municipales. Ninguna de estas señales representa por sí sola la opinión de toda la población.';
  listen.querySelector('.chart-tabs').insertAdjacentHTML('beforebegin',`<h2>Reportes ciudadanos 311</h2><p class="note">Desglose por tema y borough: ${period}. El total anual 2025 está en Municipio.</p>`);
  listen.querySelectorAll('.metric .source').forEach(e=>{if(e.textContent.includes('NYC 311'))e.textContent=e.textContent.replace('2025',period);});
  for(const item of Object.values(sourceItems)){if(item.key==='requests')item.period=period;}
  $('#requests-topic-chart').parentElement.querySelector('h2 small').textContent=`Top 10 · ${period} · etiquetas originales`;
  $('#requests-borough-chart').parentElement.querySelector('h2 small').textContent=`Solicitudes ${period} por 1.000 residentes PEP 2025`;
  if(D.wikipedia?.length){
    const pages=D.wikipedia,boroughPages=pages.filter(p=>['Manhattan','Brooklyn','Queens','The_Bronx','Staten_Island'].includes(p.article));
    const landmarkPages=pages.filter(p=>['Central_Park','Empire_State_Building','Statue_of_Liberty'].includes(p.article));
    const wikiTotal=pages.find(p=>p.article==='New_York_City');
    const short=s=>s.replaceAll('_',' ').replace('The Bronx','Bronx');
    const visits=p=>p.items.reduce((n,x)=>n+x.views,0);
    listen.querySelector('.section-intro').insertAdjacentHTML('afterend',`<div class="metrics">${metric(fmt(wikiTotal?visits(wikiTotal):0),'Vistas artículo New York City','','wikipedia','sep. 2025 – ago. 2026')}${metric(fmt(boroughPages.length),'Boroughs comparados','','wikipedia','sep. 2025 – ago. 2026')}${metric(fmt(landmarkPages.length),'Hitos urbanos comparados','','wikipedia','sep. 2025 – ago. 2026')}${metric(fmt(D.news?.length||0),'Titulares en muestra RSS','','news','ago. – sep. 2026')}</div><div class="split">${chartBox('wiki-trend','Atención a los cinco boroughs','Vistas mensuales · Wikipedia en inglés · usuarios','wikipedia','Vistas brutas mensuales a los artículos de los 5 boroughs.')}${chartBox('wiki-places','Los hitos que despiertan interés','Vistas acumuladas · doce meses','wikipedia','Artículos de monumentos y espacios emblemáticos comparados entre sí.')}</div>`);
    const timestamps=[...new Set(pages.flatMap(p=>p.items.map(x=>x.month)))].sort();
    lines('wiki-trend',timestamps.map(x=>x.slice(4)+'/'+x.slice(2,4)),boroughPages.map(p=>({name:short(p.article),values:timestamps.map(t=>p.items.find(x=>x.month===t)?.views??null)})));
    const ranks=[...landmarkPages].sort((a,b)=>visits(b)-visits(a));bars('wiki-places',ranks.map(p=>short(p.article)),[{name:'Vistas',values:ranks.map(visits),color:palette[1]}]);
  }
  if(D.news?.length){
    const seen=new Set();
    const cleanNews=[];
    for(const item of D.news){
      const slug=(item.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,35);
      if(!seen.has(slug)&&item.title&&item.link){
        seen.add(slug);
        cleanNews.push(item);
      }
    }
    const category=item=>/housing|rent|apartment|building|real estate|eviction|tenant/i.test(item.title)?'Vivienda':/subway|transit|traffic|bus|train|mta|congestion|bike|commute/i.test(item.title)?'Transporte':/police|crime|shoot|murder|safety|nypd|arrest|gun/i.test(item.title)?'Seguridad':/mayor|council|budget|city hall|election|comptroller|adams/i.test(item.title)?'Gobierno':/art|museum|theater|music|festival|broadway|culture/i.test(item.title)?'Cultura':/climate|heat|storm|flood|park|environment|air|pollution|rain/i.test(item.title)?'Ambiente':'Otros';
    listen.insertAdjacentHTML('beforeend',`<div class="split">${chartBox('news-topics','Temas en la prensa','Muestra RSS · clasificación temática','news','Clasificación por patrones léxicos sobre la muestra consultada.')}${chartBox('news-media','Quién cubre Nueva York','Titulares por medio en la muestra','news')}</div><h2>Titulares recientes</h2><div class="chart-tabs"><label for="news-theme">Tema</label><select id="news-theme"><option>Todos</option>${['Vivienda','Transporte','Seguridad','Gobierno','Cultura','Ambiente','Otros'].map(x=>`<option>${x}</option>`).join('')}</select></div><div id="news-list" class="link-list"></div><div class="callout warning"><p><strong>Sesgos metodológicos en escucha social:</strong><br>• <em>NYC 311:</em> Mide la propensión cívica a registrar reportes administrativos, no victimización real.<br>• <em>Wikipedia:</em> Mide el interés de internautas globales en inglés, no las prioridades de los vecinos.<br>• <em>Prensa RSS:</em> Refleja la agenda editorial de los medios en una ventana de 30 días, no una encuesta representativa de residentes.</p></div>`);
    const draw=()=>{const theme=$('#news-theme').value;$('#news-list').innerHTML=cleanNews.filter(x=>theme==='Todos'||category(x)===theme).map(x=>`<a href="${esc(x.link)}" target="_blank" rel="noopener"><span>${esc(x.title)}<span class="source">${esc(x.source)} · ${new Date(x.date).toLocaleDateString('es-CO')} · ${category(x)}</span></span><span aria-hidden="true">↗</span></a>`).join('')||'<p class="empty">Sin titulares de ese tema en la muestra.</p>';};
    $('#news-theme').onchange=draw;draw();
    const counts=group(cleanNews.map(x=>({topic:category(x),count:1})),'topic');bars('news-topics',counts.map(x=>x[0]),[{name:'Titulares',values:counts.map(x=>x[1])}]);
    const media=group(cleanNews.map(x=>({source:x.source,count:1})),'source').slice(0,8);bars('news-media',media.map(x=>x[0]),[{name:'Titulares',values:media.map(x=>x[1]),color:palette[1]}]);
  }
  if(D.climate?.length){
    $('#ambiente .callout').insertAdjacentHTML('beforebegin',`<div class="split">${chartBox('climate-chart','Una década de clima urbano','Media anual de máximas y mínimas diarias · °C','climate')}${chartBox('climate-rain','Precipitación anual','mm · reanálisis 2015–2025','climate')}</div>`);
    lines('climate-chart',D.climate.map(x=>String(x.year)),[{name:'Máxima media',values:D.climate.map(x=>+x.max.toFixed(1))},{name:'Mínima media',values:D.climate.map(x=>+x.min.toFixed(1))}]);bars('climate-rain',D.climate.map(x=>String(x.year)),[{name:'mm',values:D.climate.map(x=>x.rain!=null?+x.rain.toFixed(1):null),color:palette[2]}],false);
  }
}
function updateRequestCharts(){
  const b=$('#requests-borough').value,items=(D.requests||[]).filter(r=>b==='NYC'||r.borough===b.toUpperCase());
  if(!items.length){$('#requests-topic-chart').innerHTML='<p class="empty">La consulta por tema no respondió. El total mensual de 2025 sí está disponible en Municipio.</p>';$('#requests-borough-chart').innerHTML='<p class="empty">Sin desglose verificable por borough en este corte.</p>';return;}
  const topics=group(items,'complaint_type').slice(0,10);
  bars('requests-topic-chart',topics.map(x=>x[0].length>27?x[0].slice(0,26)+'…':x[0]),[{name:'Solicitudes',values:topics.map(x=>x[1])}]);
  bars('requests-borough-chart',boroughs.map(b=>b.name),[{name:'Por 1.000 residentes',values:boroughs.map(b=>b.requestRate),color:palette[1]}]);
}
function updateCorrelation(){
  const x=$('#axis-x').value,y=$('#axis-y').value,method=$('#correlation-method').value,vx=variables[x],vy=variables[y],r=correlation(boroughs.map(b=>b[x]),boroughs.map(b=>b[y]),method);
  const base=baseOption();
  plot('scatter-chart',{...base,grid:{left:25,right:50,bottom:55,top:25,containLabel:true},tooltip:{trigger:'item',confine:true,formatter:p=>`${esc(p.name)}<br>${esc(vx.label)}: ${fmt(p.value[0],1)}<br>${esc(vy.label)}: ${fmt(p.value[1],1)}`},xAxis:{...base.xAxis,type:'value',name:vx.unit,nameLocation:'middle',nameGap:35,scale:true,axisLabel:{formatter:v=>compact(v)}},yAxis:{...base.yAxis,type:'value',name:vy.unit,scale:true,axisLabel:{formatter:v=>compact(v)}},series:[{type:'scatter',symbolSize:17,data:boroughs.map((b,i)=>({name:b.name,value:[b[x],b[y]],itemStyle:{color:palette[i]}})),label:{show:true,formatter:'{b}',position:'top',color:'#d2e1e5',fontSize:11}}]});
  $('#correlation-label').textContent=method.toUpperCase();$('#correlation-value').textContent=r===null?'N/D':(r>=0?'+':'')+fmt(r,2);
  $('#correlation-description').textContent=`n = 5 boroughs · ${method==='spearman'?'rangos con promedio para empates':'relación lineal'}. ${r===null?'No calculable: la variable no tiene variación.':`Asociación ${r<0?'inversa':'directa'} en este corte.`} No mide efectos causales. Se combinan periodos diferentes cuando las fuentes lo requieren; revísalos abajo.`;
  $('#correlation-sources').innerHTML=[['EJE X',vx],['EJE Y',vy]].map(([label,v])=>`<div><span class="eyebrow">${label}</span><h3>${v.label}</h3><p class="note">${v.unit} · ${v.period}</p>${sourceLink(v.source)}</div>`).join('');
}
let atlasMetric='density',atlasSelected='Manhattan';
function updateAtlas(){
  const v=variables[atlasMetric],rank=[...boroughs].sort((a,b)=>b[atlasMetric]-a[atlasMetric]),selected=boroughs.find(b=>b.name===atlasSelected);
  $('#atlas-title').textContent=v.label;$('#atlas-unit').textContent=v.unit+' · '+v.period;
  $('#atlas-ranking').innerHTML=rank.map((b,i)=>`<button data-atlas-borough="${b.name}" class="${b.name===atlasSelected?'active':''}"><span>#${i+1} ${b.name}</span><strong>${fmt(b[atlasMetric],atlasMetric==='density'||atlasMetric==='population'||atlasMetric==='income'||atlasMetric==='rent'?0:1)}</strong></button>`).join('');
  $('#atlas-detail').innerHTML=`<div><span class="eyebrow">TERRITORIO SELECCIONADO</span><h3>${selected.name}</h3><span class="source">FIPS 36${selected.fips} · ${fmt(selected.area,1)} km²</span></div><button data-goto-borough="${selected.name}"><i data-lucide="map"></i> Ver en el gemelo</button>`;
  $('#atlas-legend').textContent=`Menor ${fmt(Math.min(...boroughs.map(b=>b[atlasMetric])),1)} → Mayor ${fmt(Math.max(...boroughs.map(b=>b[atlasMetric])),1)} ${v.unit}. ${v.period}.`;
  $$('[data-atlas-metric]').forEach(el=>el.classList.toggle('active',el.dataset.atlasMetric===atlasMetric));
  mapApi?.updateAtlas(atlasMetric,atlasSelected);
}
function renderSources(){
  const q=$('#source-filter').value.toLowerCase(),theme=$('#source-theme').value,list=catalog.filter(s=>(theme==='all'||s.theme===theme)&&`${s.name} ${s.agency} ${s.key}`.toLowerCase().includes(q));
  $('#source-count').textContent=`${list.length} fuentes · última verificación ${latestVerifiedDate()}`;
  $('#source-table').innerHTML=list.length?list.map(s=>`<tr><td><strong>${esc(sourceIdLabel(s.key))} · ${esc(s.name)}</strong><span class="source">${esc(s.agency)} · probado ${s.tested}</span></td><td>${esc(s.theme)}</td><td>${esc(s.period)}</td><td><span class="status-label ${['no disponible','requiere clave'].includes(s.status)?'unavailable':''}">${esc(s.status)}</span></td><td>${s.rows?fmt(s.rows):'No aplica'}</td><td><button data-source="${s.key}" aria-label="Ver fuente ${esc(s.name)}"><i data-lucide="external-link"></i></button></td></tr>`).join(''):'<tr><td colspan="6">No hay fuentes que coincidan.</td></tr>';
  createIcons({icons});
}
function showSource(key,item){
  const s=catalog.find(x=>x.key===key);if(!s)return;
  const b=key==='census'&&item?.territory&&boroughs.find(b=>b.name===item.territory);
  $('#source-detail').innerHTML=`${item?`<span class="eyebrow">${esc(item.territory||'Nueva York')}</span><h3>${esc(item.label)}</h3><p><strong>${esc(item.value)} ${esc(item.unit)}</strong></p>`:''}<dl><dt>ID de fuente</dt><dd><strong>${esc(sourceIdLabel(key))}</strong></dd><dt>Fuente</dt><dd>${esc(s.name)}</dd><dt>Entidad</dt><dd>${esc(s.agency)}</dd><dt>Vigencia</dt><dd>${esc(item?.period||s.period)}</dd><dt>Probado</dt><dd>${s.tested}</dd><dt>Estado</dt><dd>${esc(s.status)}</dd><dt>Método</dt><dd>${esc(item?.detail||s.method)}</dd>${s.note?`<dt>Límite</dt><dd>${esc(s.note)}</dd>`:''}</dl><p><a href="${b?.source||s.source}" target="_blank" rel="noopener">Abrir fuente original ↗</a></p>${s.url?`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir consulta reproducible ↗</a></p>`:''}`;
  $('#source-dialog').showModal();
}
let culturePage=0;
const CULTURE_PAGE_SIZE=40;
function renderCulture(){
  const q=($('#culture-filter')?.value||'').toLowerCase().trim();
  const b=$('#culture-borough-filter')?.value||'all';
  const allItems=D.culture||[];
  const filtered=allItems.filter(x=>{
    const matchBoro=b==='all'||x.borough===b;
    const matchText=!q||`${x.organization_name} ${x.borough} ${x.address||''}`.toLowerCase().includes(q);
    return matchBoro&&matchText;
  });
  const total=filtered.length;
  const maxPage=Math.max(0,Math.ceil(total/CULTURE_PAGE_SIZE)-1);
  if(culturePage>maxPage)culturePage=maxPage;
  const start=culturePage*CULTURE_PAGE_SIZE;
  const pageItems=filtered.slice(start,start+CULTURE_PAGE_SIZE);
  const label=$('#culture-count-label');
  if(label)label.textContent=`Directorio DCLA · ${fmt(total)} organizaciones${b!=='all'?` en ${b}`:''}`;
  const summary=$('#culture-result-summary');
  if(summary)summary.textContent=total?`Mostrando ${start+1}–${Math.min(start+CULTURE_PAGE_SIZE,total)} de ${fmt(total)} organizaciones (página ${culturePage+1} de ${maxPage+1}).`:'No hay organizaciones que coincidan con la búsqueda.';
  const dir=$('#culture-directory');
  if(dir)dir.innerHTML=pageItems.length?pageItems.map(x=>`<div class="signal"><strong>${esc(x.organization_name)}</strong><span class="source">${esc(x.borough)} · ${esc(x.address||'Sin dirección')}</span></div>`).join(''):'<p class="empty">No hay coincidencias.</p>';
  applyGlobalCardTemplate();
  const pag=$('#culture-pagination');
  if(pag){
    if(maxPage>0){
      pag.innerHTML=`<button id="culture-prev" ${culturePage===0?'disabled':''} class="button">← Anterior</button><span class="note">Página ${culturePage+1} de ${maxPage+1}</span><button id="culture-next" ${culturePage>=maxPage?'disabled':''} class="button">Siguiente →</button>`;
      $('#culture-prev').onclick=()=>{if(culturePage>0){culturePage--;renderCulture();}};
      $('#culture-next').onclick=()=>{if(culturePage<maxPage){culturePage++;renderCulture();}};
    }else{
      pag.innerHTML='';
    }
  }
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3200);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copiado al portapapeles');}catch{toast('No se pudo copiar. El navegador necesita permiso de portapapeles.');}}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function navigate(id){const el=document.getElementById(id);if(!el)return;location.hash=id;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}
async function openMap(){navigate('gemelo');await ensureMap();}
async function goPlace(index){await openMap();mapApi.flyPlace(places[index]);}
async function goBorough(name){await openMap();mapApi.flyBorough(name);}
async function searchPlace(value){const q=value.trim().toLowerCase();if(!q)return;const idx=places.findIndex(p=>p.name.toLowerCase().includes(q));if(idx>=0)return goPlace(idx);const b=boroughs.find(b=>b.name.toLowerCase().includes(q));if(b)return goBorough(b.name);const nta=D.neighborhoods.features.find(f=>f.properties.ntaname.toLowerCase().includes(q));if(nta){const code=nta.properties.nta2020;await openMap();const feature=D.neighborhoods.features.find(f=>f.properties.nta2020===code);if(feature)mapApi.flyFeature(feature);return;}toast('No se encontró ese lugar. Prueba un borough, un barrio o uno de los hitos del recorrido.');}
let mapPromise;
async function ensureMap(){
  if(mapApi)return mapApi;
  if(!mapPromise)mapPromise=import('./maps.js').then(async({initMaps})=>{
    for(const key of ['boroughs','neighborhoods','buildings','parks','energy']){
      const file=D.urbanDiagnostic&&key==='buildings'?'urbanBuildings':D.urbanDiagnostic&&key==='energy'?'urbanEnergy':key;
      const response=await fetch(`/data/${file}.json`);if(!response.ok)throw new Error(`No se pudo cargar ${key}`);D[key]=await response.json();
    }
    mapApi=await initMaps({D,boroughs,places,fmt,esc,toast,onSelect:name=>{atlasSelected=name;updateAtlas();},onUrbanSelect:id=>{const el=$('#urban-primary');if(el){el.value=id;el.dispatchEvent(new Event('change'));}} });if(urbanState)mapApi.updateUrban(urbanState);updateAtlas();return mapApi;
  }).catch(e=>{$('#map-status').textContent='No se pudo iniciar el mapa. Revisa WebGL o recarga la página.';mapPromise=null;console.error(e);throw e;});
  return mapPromise;
}
function initSearch(){
  const dialog=$('#search-dialog');
  const draw=()=>{const q=$('#global-search').value.toLowerCase();$('#search-results').innerHTML=[...sections.map(([id,label])=>({label,kind:'Sección',id})),...boroughs.map(b=>({label:b.name,kind:'Borough',borough:b.name})),...places.map((p,i)=>({label:p.name,kind:'Lugar',place:i}))].filter(x=>x.label.toLowerCase().includes(q)).map(x=>`<button ${x.id?`data-search-section="${x.id}"`:x.borough?`data-goto-borough="${x.borough}"`:`data-place="${x.place}"`}><span>${x.label}</span><small>${x.kind}</small></button>`).join('')||'<p class="empty">Sin coincidencias.</p>';};
  const open=()=>{draw();dialog.showModal();$('#global-search').focus();};
  $('#open-search').onclick=open;$('#mobile-search').onclick=open;$('#global-search').oninput=draw;
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();open();}});
}
function bind(){
  $('#primary').onchange=e=>{primary=e.target.value;updateDiagnosis();};$('#comparison').onchange=e=>{comparison=e.target.value;updateDiagnosis();};
  $('#swap-boroughs').onclick=()=>{[primary,comparison]=[comparison,primary];$('#primary').value=primary;$('#comparison').value=comparison;updateDiagnosis();};
  $$('[data-weight]').forEach(el=>el.oninput=()=>{weights[+el.dataset.weight]=+el.value;$$('[data-preset]').forEach(b=>b.classList.remove('active'));updateDiagnosis();});
  $('#place-search').onsubmit=e=>{e.preventDefault();searchPlace($('#place-query').value);};
  $('#view-primary').onclick=()=>goBorough(primary);
  $('#copy-diagnosis').onclick=()=>copy(`${primary}: ${$('#score').textContent}\n${$('#reading-text').textContent}\nPesos: ${weights.join(', ')}. Fuentes: Census QuickFacts y NYPD. ${location.origin}/#fuentes`);
  $('#people-borough').onchange=updatePeople;
  $('#requests-borough').onchange=updateRequestCharts;
  $('#culture-filter').oninput=()=>{culturePage=0;renderCulture();};
  $('#culture-borough-filter').onchange=()=>{culturePage=0;renderCulture();};
  $('#source-filter').oninput=renderSources;$('#source-theme').onchange=renderSources;
  $('#download-catalog').onclick=()=>download('cerebro-nyc-catalogo.json',JSON.stringify({tested:D.catalog.tested,sources:catalog},null,2),'application/json');
  $('#download-data').onclick=()=>{const keys=['name',...Object.keys(variables)],csv=[keys.join(','),...boroughs.map(b=>keys.map(k=>`"${String(b[k]).replaceAll('"','""')}"`).join(','))].join('\n');download('cerebro-nyc-boroughs.csv','\uFEFF'+csv,'text/csv;charset=utf-8');};
  $('#axis-x').innerHTML=$('#axis-y').innerHTML=Object.entries(variables).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');$('#axis-x').value='income';$('#axis-y').value='poverty';
  $('#axis-x').onchange=updateCorrelation;$('#axis-y').onchange=updateCorrelation;$('#correlation-method').onchange=updateCorrelation;
  $('#swap-axes').onclick=()=>{const x=$('#axis-x').value;$('#axis-x').value=$('#axis-y').value;$('#axis-y').value=x;updateCorrelation();};
  $('#atlas-metrics').innerHTML=['density','population','income','rent','foreign','over65','crashRate','trees'].map(k=>`<button data-atlas-metric="${k}">${variables[k].label}</button>`).join('');
  $('#menu-toggle').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
  document.addEventListener('click',async e=>{
    const t=e.target.closest('button,a,tr[data-borough]');if(!t)return;
    if(t.dataset.close)$('#'+t.dataset.close).close();
    if(t.dataset.metric){const item=sourceItems[t.dataset.metric];showSource(item.key,item);}
    else if(t.dataset.source)showSource(t.dataset.source);
    if(t.dataset.preset!==undefined){weights=[[20,20,20],[60,20,20],[20,60,20],[20,20,60]][+t.dataset.preset];$$('[data-weight]').forEach((x,i)=>x.value=weights[i]);$$('[data-preset]').forEach(x=>x.classList.toggle('active',x===t));updateDiagnosis();}
    if(t.dataset.selectBorough){primary=t.dataset.selectBorough;$('#primary').value=primary;updateDiagnosis();}
    if(t.dataset.place!==undefined){$('#search-dialog').close();goPlace(+t.dataset.place);}
    if(t.dataset.gotoBorough){$('#search-dialog').close();goBorough(t.dataset.gotoBorough);}
    if(t.dataset.searchSection){$('#search-dialog').close();navigate(t.dataset.searchSection);}
    if(t.dataset.pair){const [x,y]=t.dataset.pair.split(',');$('#axis-x').value=x;$('#axis-y').value=y;$$('[data-pair]').forEach(b=>b.classList.toggle('active',b===t));updateCorrelation();}
    if(t.dataset.atlasMetric){atlasMetric=t.dataset.atlasMetric;updateAtlas();}
    if(t.dataset.atlasBorough){atlasSelected=t.dataset.atlasBorough;updateAtlas();}
    if(t.dataset.borough&&!e.target.closest('a'))goBorough(t.dataset.borough);
    if(t.matches('#navigation a,.sidebar-bottom a'))$('#sidebar').classList.remove('open');
  });
  $('#show-security-map').onclick=()=>{atlasMetric='crashRate';navigate('atlas');updateAtlas();};
  $('#show-satellite').onclick=async()=>{await openMap();mapApi.setBasemap('satellite');mapApi.showLayer('parks',true);mapApi.viewCity();};
  $('#map-search').onchange=e=>searchPlace(e.target.value);
  initSearch();initPresentation();
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){currentSection=e.target.id;const label=sections.find(x=>x[0]===currentSection)?.[1];if(label)$('#active-section').textContent=label.toUpperCase();$$('#navigation a').forEach(a=>{a.classList.toggle('active',a.hash==='#'+currentSection);a.setAttribute('aria-current',a.hash==='#'+currentSection?'location':'false');});}},{rootMargin:'-12% 0px -65% 0px'});$$('.section').forEach(el=>observer.observe(el));
  const mapObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){ensureMap().catch(()=>{});mapObserver.disconnect();}},{rootMargin:'300px'});mapObserver.observe($('#gemelo'));
  new ResizeObserver(()=>{charts.forEach(c=>c.resize());mapApi?.resize();}).observe($('#main'));
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1).split('?')[0];if(id==='gemelo'||id==='atlas')ensureMap().catch(()=>{});});
}
function initPresentation(){
  let index=0,controls;
  const show=()=>{$$('.section').forEach(el=>el.classList.toggle('present-slide',el.id===sections[index][0]));window.scrollTo(0,0);charts.forEach(c=>c.resize());mapApi?.resize();if(index===1||index===9)ensureMap().catch(()=>{});$('#active-section').textContent=`${index+1} / ${sections.length} · ${sections[index][1]}`;};
  const exit=()=>{document.body.classList.remove('presenting');controls?.remove();charts.forEach(c=>c.resize());mapApi?.resize();};
  $('#presentation').onclick=()=>{document.body.classList.add('presenting');index=0;controls=document.createElement('div');controls.className='presentation-controls';controls.innerHTML='<button id="prev-slide" aria-label="Sección anterior">←</button><button id="next-slide" aria-label="Sección siguiente">→</button><button id="exit-presentation">Salir</button>';document.body.append(controls);$('#prev-slide').onclick=()=>{index=Math.max(0,index-1);show();};$('#next-slide').onclick=()=>{index=Math.min(sections.length-1,index+1);show();};$('#exit-presentation').onclick=exit;show();};
  document.addEventListener('keydown',e=>{if(!document.body.classList.contains('presenting')||e.target.matches('input,select'))return;if(e.key==='Escape')exit();if(e.key==='ArrowRight'){index=Math.min(sections.length-1,index+1);show();}if(e.key==='ArrowLeft'){index=Math.max(0,index-1);show();}});
}
async function weather(){
  try{
    const url='https://api.open-meteo.com/v1/forecast?latitude=40.758&longitude=-73.9855&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America%2FNew_York&forecast_days=7';
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Weather unavailable');const data=await response.json();
    $('#weather-top').textContent=`${fmt(data.current.temperature_2m,1)} °C · ${data.current.relative_humidity_2m} % HR · ${fmt(data.current.wind_speed_10m)} km/h`;
    $('#weather-value').textContent=fmt(data.current.temperature_2m,1)+' °C';$('#weather-time').textContent='Open-Meteo · '+data.current.time.replace('T',' ')+' NY';
    const labels=data.daily.time.map(x=>new Date(x+'T12:00:00').toLocaleDateString('es',{weekday:'short',day:'numeric'}));
    lines('forecast-chart',labels,[{name:'Máxima',values:data.daily.temperature_2m_max.map(v=>v!=null?+v.toFixed(1):null)},{name:'Mínima',values:data.daily.temperature_2m_min.map(v=>v!=null?+v.toFixed(1):null)}]);bars('rain-chart',labels,[{name:'mm',values:data.daily.precipitation_sum.map(v=>v!=null?+v.toFixed(1):null),color:palette[2]}],false);
  }catch{$('#weather-value').textContent='Sin conexión';$('#weather-time').textContent='No se pudo consultar el pronóstico';for(const id of ['forecast-chart','rain-chart'])$('#'+id).innerHTML='<p class="empty">El servicio meteorológico no respondió. Los datos históricos siguen disponibles.</p>';}
}
async function boot(){
  try{
    const response=await fetch('/data/catalog.json');if(!response.ok)throw new Error('Catálogo no disponible');D.catalog=await response.json();
    const dashboard=await fetch('/data/dashboard.json');if(!dashboard.ok)throw new Error('Resumen no disponible');Object.assign(D,await dashboard.json());
    for(const source of D.catalog.datasets){if(!['integrado','copia previa'].includes(source.status)||['boroughs','neighborhoods','buildings','parks','energy','urbanBuildings','urbanEnergy'].includes(source.key))continue;const r=await fetch(`/data/${source.key}.json`);if(r.ok)D[source.key]=await r.json();else source.status='no disponible';}
    catalog=[...D.catalog.datasets,...manualSources];
    sourceIdsByKey=new Map();
    for(const row of D.sourceUsage?.rows||[]){if(!sourceIdsByKey.has(row.key))sourceIdsByKey.set(row.key,[]);sourceIdsByKey.get(row.key).push(row.id);}
    catalog.find(s=>s.key==='buildings').note='Recorte de Midtown: 40.735–40.775 N, 74.015–73.965 O; máximo 10.000 huellas. No cubre todo NYC.';
    enrich();render();bind();updatePeople();renderCharts();addSupplementViews();updateDiagnosis();updateCorrelation();updateAtlas();renderSources();renderCulture();weather();
    if(D.urbanDiagnostic){
      const old=$('.diagnosis'),details=document.createElement('details');details.innerHTML='<summary>Contexto adicional: comparación de cinco boroughs</summary>';old.before(details);details.append(old);
      const urban=document.createElement('article');urban.id='urban-diagnostic';urban.className='chart-panel';details.before(urban);
      mountUrban({data:D.urbanDiagnostic,container:urban,esc,fmt,copy,download,onChange:state=>{urbanState=state;mapApi?.updateUrban(state);},onMap:async id=>{try{await openMap();mapApi.flyUrban(id);}catch{toast('Mapa no disponible; la rejilla y las cifras siguen disponibles aquí.');}}});
    }
    const ntaContainer=document.createElement('article');ntaContainer.id='nta-explorer';ntaContainer.className='chart-panel';$('#atlas').append(ntaContainer);
    mountTerritories({data:D.territories,container:ntaContainer,esc,fmt,download,onMap:async id=>{try{await openMap();const feature=D.neighborhoods.features.find(f=>f.properties.nta2020===id);if(feature)mapApi.flyFeature(feature);}catch{toast('No se pudo abrir el mapa. La ficha territorial sigue disponible.');}}});
    if(D.territories){
      const compositeContainer=document.createElement('article');compositeContainer.id='nta-composite';compositeContainer.className='chart-panel';$('#atlas').querySelector('.section-intro').after(compositeContainer);
      let geometry;try{const r=await fetch('/data/neighborhoods.json');if(r.ok)geometry=await r.json();}catch{}
      mountComposite({data:D.territories,geometry,container:compositeContainer,esc,fmt,download,onMap:async id=>{try{await openMap();const f=D.neighborhoods.features.find(f=>f.properties.nta2020===id);if(f)mapApi.flyFeature(f);}catch{toast('Mapa no disponible; consulta la tabla territorial.');}}});
      const relations=document.createElement('article');relations.id='nta-relations';relations.className='chart-panel';$('#correlaciones').querySelector('.section-intro').after(relations);mountRelations({data:D.territories,container:relations,esc,fmt,plot});
      $('#atlas').querySelector('.section-intro').textContent='Índice configurable para los barrios NTA2020, comparación entre áreas y contexto de los cinco boroughs. Cada vista conserva sus unidades, períodos y cobertura.';
      $('#correlaciones').querySelector('.section-intro').textContent='Explora relaciones entre barrios NTA2020 con filtros de calidad. La vista de cinco boroughs se conserva debajo como contexto independiente.';
    }
    mountExcelViews({D,catalog,esc,fmt,bars,plot});
    const [service,traffic]=await Promise.all(['serviceOutcomes','trafficCounts'].map(async key=>{const r=await fetch('/data/'+key+'.json');if(!r.ok)throw Error('Indicador no disponible: '+key);return r.json();}));
    mountOutcomes({service,traffic,esc,fmt});
    applyGlobalCardTemplate();
    if(location.hash){const id=location.hash.slice(1).split('?')[0];requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView());if(['gemelo','atlas'].includes(id))ensureMap().catch(()=>{});}
    setInterval(()=>{$('#clock').textContent=new Date().toLocaleString('es-CO',{timeZone:'America/New_York',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' NY';},1000);
    document.documentElement.dataset.ready='true';
  }catch(e){$('#app').innerHTML='<div class="callout warning"><h2>No se pudieron cargar los datos</h2><p>Recarga la página para intentarlo de nuevo. No se muestran cifras de ejemplo.</p><button onclick="location.reload()">Reintentar</button></div>';console.error(e);}
}
boot();


// Progressive enhancement: reveal only when sections enter the viewport.
// Runs after the dashboard has mounted and respects reduced-motion preferences.
function initEditorialMotion(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const targets=[...document.querySelectorAll('#app > .section')];
  if(!targets.length) return;
  document.documentElement.classList.add('js-motion');
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },{threshold:.045,rootMargin:'0px 0px 45px 0px'});
  targets.forEach((el,i)=>{
    if(el.getBoundingClientRect().top < window.innerHeight*.9) return;
    el.classList.add('motion-ready');
    observer.observe(el);
  });
}
window.addEventListener('load',()=>requestAnimationFrame(()=>{initEditorialMotion();applyGlobalCardTemplate();}),{once:true});


function applyGlobalCardTemplate(){
  const selector=[
    '.metric',
    '.chart-panel',
    '.signal-list .signal',
    '.split > div',
    '.reading-body',
    '.rank-summary',
    '.controls label',
    '.urban-weights label',
    '.urban-cards article',
    '.method-grid > div',
    '.table-wrap',
    '.map-toolbar',
    '.map-explorer details',
    '.map-summary',
    '.map-status',
    '.tour-buttons button',
    '.correlation-result',
    '.ranking button',
    '.link-list a'
  ].join(',');
  const cards=[...document.querySelectorAll(selector)].filter(el=>!el.classList.contains('template-card'));
  cards.forEach((el,i)=>{
    el.classList.add('template-card');
    el.dataset.floatVariant=['a','b','c'][i%3];
    el.style.setProperty('--card-delay',`${(i%10)*70}ms`);
  });
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)){
    cards.forEach(el=>el.classList.add('card-visible'));
    return;
  }
  if(!document.documentElement.classList.contains('js-card-motion')) document.documentElement.classList.add('js-card-motion');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('card-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.16,rootMargin:'0px 0px -30px 0px'});
  cards.forEach(el=>observer.observe(el));
}
