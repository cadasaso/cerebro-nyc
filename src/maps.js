import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const collection=features=>({type:'FeatureCollection',features});
function point(coords,properties){return {type:'Feature',geometry:{type:'Point',coordinates:coords},properties};}
const valid=coords=>coords&&coords.length===2&&coords.every(Number.isFinite)&&coords[0]>-75&&coords[0]<-73&&coords[1]>40&&coords[1]<42;
function distance(a,b){const R=6371008.8,r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r;return R*2*Math.atan2(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2),Math.sqrt(1-(Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2)));}
function radius(lngLat,meters){const features=[];for(const m of meters){const ring=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;ring.push([lngLat[0]+Math.cos(a)*m/(111320*Math.cos(lngLat[1]*Math.PI/180)),lngLat[1]+Math.sin(a)*m/111320]);}features.push({type:'Feature',properties:{radius:m},geometry:{type:'Polygon',coordinates:[ring]}});}return collection(features);}
function bounds(geometry){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const walk=a=>{if(typeof a[0]==='number'){minX=Math.min(minX,a[0]);maxX=Math.max(maxX,a[0]);minY=Math.min(minY,a[1]);maxY=Math.max(maxY,a[1]);}else a.forEach(walk);};walk(geometry.coordinates);return [[minX,minY],[maxX,maxY]];}
function makeBuildings(data,onReady){
  const origin=maplibregl.MercatorCoordinate.fromLngLat([-73.9855,40.758],0),scale=origin.meterInMercatorCoordinateUnits();
  const grouped=[[],[],[]];let rendered=0;
  for(const f of data.features){
    const height=Number(f.properties.height_roof)*.3048;
    if(!(height>0&&height<700))continue;
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const rings of polygons){
      const paths=rings.map((ring,i)=>{
        const shape=i===0?new THREE.Shape():new THREE.Path();
        ring.forEach((coord,j)=>{const merc=maplibregl.MercatorCoordinate.fromLngLat(coord);const x=(merc.x-origin.x)/scale,y=-(merc.y-origin.y)/scale;j?shape.lineTo(x,y):shape.moveTo(x,y);});
        return shape;
      });
      if(!paths.length)continue;
      paths[0].holes.push(...paths.slice(1));
      const geometry=new THREE.ExtrudeGeometry(paths[0],{depth:height,bevelEnabled:false,steps:1});
      grouped[height>100?2:height>35?1:0].push(geometry);
    }
    rendered++;
  }
  return {id:'nyc-buildings-three',type:'custom',renderingMode:'3d',visible:true,
    onAdd(map,gl){
      this.map=map;this.camera=new THREE.Camera();this.scene=new THREE.Scene();
      this.scene.add(new THREE.AmbientLight(0xffffff,1.7));
      const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-1000,-1000,3000);this.scene.add(sun);
      grouped.forEach((geometries,i)=>{if(!geometries.length)return;const geometry=mergeGeometries(geometries,false);const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:['#a6d8d6','#6dbdb8','#ee9879'][i],side:THREE.DoubleSide}));mesh.frustumCulled=false;this.scene.add(mesh);geometries.forEach(g=>g.dispose());});
      this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.renderer.autoClear=false;onReady(rendered);
    },
    render(gl,args){
      if(!this.visible)return;
      const matrix=args.defaultProjectionData?.mainMatrix||args.defaultProjectionData?.projectionMatrix||args;
      const projection=new THREE.Matrix4().fromArray(matrix);
      const transform=new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).scale(new THREE.Vector3(scale,-scale,scale));
      this.camera.projectionMatrix=projection.multiply(transform);
      this.renderer.resetState();this.renderer.render(this.scene,this.camera);this.renderer.resetState();
    },
    onRemove(){this.scene.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose();});this.renderer.dispose();}
  };
}

export async function initMaps({D,boroughs,places,fmt,esc,toast,onSelect,onUrbanSelect}){
  const ntaById=new Map((D.territories?.rows||[]).map(r=>[r.id,r]));
  function ntaSummary(code){const row=ntaById.get(code);if(!row)return 'Ficha NTA no disponible';if(!row.residential)return esc(row.typeLabel)+' · fuera de la comparación residencial';return 'Población: '+fmt(row.metrics.population)+' ± '+fmt(row.quality.population.marginOfError)+' · ACS 2020–2024<br>'+fmt(row.metrics.subway)+' estaciones MTA · '+fmt(row.metrics.health)+' H+H · '+fmt(row.metrics.culture)+' DCLA';}
  const colors=['#e9b08c','#8bd0c8','#7bb1cb','#bad793','#c7b8d7'];
  const boroData=structuredClone(D.boroughs);
  boroData.features.forEach(f=>{const b=boroughs.find(b=>b.name===f.properties.boroname);Object.assign(f.properties,b,{center:undefined});});
  const health=collection((D.health||[]).map(x=>point(x.location_1?.coordinates,{name:x.facility_name,borough:x.borough,type:x.facility_type})).filter(f=>valid(f.geometry.coordinates)));
  const subway=collection((D.subway||[]).map(x=>point([+x.gtfs_longitude,+x.gtfs_latitude],{name:x.stop_name,routes:x.daytime_routes,ada:x.ada,borough:x.borough})).filter(f=>valid(f.geometry.coordinates)));
  const culture=collection((D.culture||[]).map(x=>point([+x.longitude,+x.latitude],{name:x.organization_name,borough:x.borough})).filter(f=>valid(f.geometry.coordinates)));
  const energy=collection((D.energy||[]).map(x=>point([+x.longitude,+x.latitude],{name:x.property_name,eui:x.site_eui_kbtu_ft,kwh:x.electricity_use_grid_purchase_1,borough:x.borough})).filter(f=>valid(f.geometry.coordinates)));
  const placeData=collection(places.map(p=>point(p.coordinates,{name:p.name,type:p.type,borough:p.borough})));
  const datasets={boroughs:boroData,neighborhoods:D.neighborhoods,buildings:D.buildings,parks:D.parks,health,subway,culture,energy,places:placeData};
  let analyze=true,popup,base='satellite',threeLayer;
  const active={boroughs:true,neighborhoods:false,parks:false,health:false,subway:false,culture:false,energy:false,places:false,buildings:true};
  const map=new maplibregl.Map({container:'territory-map',center:[-73.9855,40.754],zoom:14.65,pitch:55,bearing:-25,maxPitch:70,canvasContextAttributes:{antialias:true,preserveDrawingBuffer:true},style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#c6d8dd'}}]},attributionControl:true});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');
  await new Promise(resolve=>map.on('load',resolve));
  const boroColors=['match',['get','boroname'],...boroughs.flatMap((b,i)=>[b.name,colors[i]]),'#9bb8c6'];
  for(const [key,data] of Object.entries(datasets))if(data)map.addSource(key,{type:'geojson',data});
  map.addSource('satellite',{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'});
  map.addSource('streets',{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'});
  map.addLayer({id:'satellite-raster',type:'raster',source:'satellite',paint:{'raster-opacity':.9}});
  map.addLayer({id:'streets-raster',type:'raster',source:'streets',layout:{visibility:'none'}});
  map.addLayer({id:'boroughs-fill',type:'fill',source:'boroughs',paint:{'fill-color':boroColors,'fill-opacity':.12}});
  map.addLayer({id:'boroughs-line',type:'line',source:'boroughs',paint:{'line-color':'#69ead7','line-width':2}});
  map.addLayer({id:'neighborhoods-fill',type:'fill',source:'neighborhoods',layout:{visibility:'none'},paint:{'fill-color':'#86d9e6','fill-opacity':.18}});
  map.addLayer({id:'neighborhoods-line',type:'line',source:'neighborhoods',layout:{visibility:'none'},paint:{'line-color':'#97e7f2','line-width':1.3}});
  map.addLayer({id:'parks-fill',type:'fill',source:'parks',layout:{visibility:'none'},paint:{'fill-color':'#80d88f','fill-opacity':.6}});
  map.addLayer({id:'parks-line',type:'line',source:'parks',layout:{visibility:'none'},paint:{'line-color':'#2b9145','line-width':1}});
  map.addLayer({id:'buildings-fill',type:'fill',source:'buildings',paint:{'fill-color':'#80dcd0','fill-opacity':.07}});
  let urbanState=null,urbanLens='urban';
  map.addSource('urban-zones',{type:'geojson',data:collection([])});
  map.addLayer({id:'urban-fill',type:'fill',source:'urban-zones',paint:{'fill-color':['case',['==',['get','hasValue'],1],['interpolate',['linear'],['get','value'],0,'#295d65',50,'#a1b675',100,'#e47b55'],'#52606a'],'fill-opacity':.48}},'buildings-fill');
  map.addLayer({id:'urban-line',type:'line',source:'urban-zones',paint:{'line-color':['case',['==',['get','selected'],1],'#ffffff','#80dcd0'],'line-width':['case',['==',['get','selected'],1],4,1.5]}});
  function updateUrban(state){urbanState=state;if(!state)return;$('#map-summary').innerHTML=urbanSummary(state.primary);map.getSource('urban-zones').setData(collection(state.scores.rows.map(r=>{const v=urbanLens==='urban'?r.score:r.normalized[urbanLens];return {type:'Feature',geometry:r.geometry,properties:{id:r.id,name:r.name,value:v??0,hasValue:Number.isFinite(v)?1:0,selected:r.id===state.primary?1:0}};})));}
  function urbanSummary(id){const r=urbanState?.scores.rows.find(r=>r.id===id);if(!r)return '';const metricLine=Object.entries(urbanState.data.metrics).map(([k,m])=>`${esc(m.name)}: ${Number.isFinite(r.metrics[k])?fmt(r.metrics[k],1):'—'} ${esc(m.unit)}`).join(' · ');return `<strong>${esc(r.name)}</strong><br><small>Índice ${r.score===null?'sin dato':fmt(r.score,1)+'/100'} · puesto #${r.rank??'—'}</small><br><small>${metricLine}</small>`;}
  function flyUrban(id){const r=urbanState?.scores.rows.find(r=>r.id===id);if(!r)return;urbanState={...urbanState,primary:id};updateUrban(urbanState);map.fitBounds(bounds(r.geometry),{padding:{left:window.innerWidth>700?310:25,right:30,top:100,bottom:70},pitch:35,bearing:0});$('#map-summary').innerHTML=urbanSummary(id);if(window.innerWidth<700)toggleExplorer(false);}
  for(const [key,color] of [['health','#ff9fa9'],['subway','#8dbbff'],['culture','#ebc98a'],['energy','#f4ca62'],['places','#d4aeff']]){
    map.addLayer({id:key+'-point',type:'circle',source:key,layout:{visibility:'none'},paint:{'circle-color':color,'circle-radius':['interpolate',['linear'],['zoom'],9,3,15,6],'circle-stroke-color':'#10232c','circle-stroke-width':1.5,'circle-opacity':.9}});
  }
  map.addSource('analysis-radius',{type:'geojson',data:collection([])});
  map.addLayer({id:'radius-fill',type:'fill',source:'analysis-radius',paint:{'fill-color':'#80dcd0','fill-opacity':.09}});
  map.addLayer({id:'radius-line',type:'line',source:'analysis-radius',paint:{'line-color':'#80dcd0','line-width':2,'line-dasharray':[3,2]}});
  let buildingRendered=0;
  if(D.buildings?.features.length){
    threeLayer=makeBuildings(D.buildings,n=>{buildingRendered=n;$('#map-status').textContent=`${fmt(n)} edificios · recorte Midtown · NYC OTI`;$('#territory-map').dataset.buildings=String(n);});
    map.addLayer(threeLayer);
  }
  $('#territory-map').dataset.mapReady='true';
  let basemapErrors=0;
  map.on('error',e=>{if(e.error?.message?.includes('tile')||e.sourceId==='satellite'||e.sourceId==='streets'){basemapErrors++;if(basemapErrors>2)$('#map-status').textContent='No se pudo completar el mapa base; las capas locales siguen disponibles.';}});
  const explorer=$('#map-explorer');
  const toggleExplorer=show=>{explorer.hidden=!show;$('#toggle-explorer').setAttribute('aria-expanded',String(show));};
  $('#toggle-explorer').onclick=()=>toggleExplorer(explorer.hidden);$('#close-explorer').onclick=()=>toggleExplorer(false);
  function showLayer(key,visible){
    active[key]=visible;
    const ids=key==='boroughs'?['boroughs-fill','boroughs-line']:key==='neighborhoods'?['neighborhoods-fill','neighborhoods-line']:key==='parks'?['parks-fill','parks-line']:key==='buildings'?['buildings-fill']:[key+'-point'];
    for(const id of ids)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');
    if(key==='buildings'&&threeLayer){threeLayer.visible=visible;map.triggerRepaint();}
    $$(`[data-layer-toggle="${key}"]`).forEach(el=>el.setAttribute('aria-pressed',String(visible)));
    $$(`[data-layer-check="${key}"]`).forEach(el=>el.checked=visible);
  }
  function setBasemap(kind){base=kind;map.setLayoutProperty('satellite-raster','visibility',kind==='satellite'?'visible':'none');map.setLayoutProperty('streets-raster','visibility',kind==='streets'?'visible':'none');$('#basemap-label').textContent={satellite:'Satélite Esri',streets:'Calles OSM',plain:'Capas locales'}[kind];$$('[name=basemap]').forEach(el=>el.checked=el.value===kind);map.setPaintProperty('boroughs-fill','fill-opacity',kind==='plain'?.65:.12);}
  $$('[data-layer-toggle]').forEach(el=>el.onclick=()=>showLayer(el.dataset.layerToggle,!active[el.dataset.layerToggle]));
  $$('[data-layer-check]').forEach(el=>el.onchange=()=>showLayer(el.dataset.layerCheck,el.checked));
  $$('[name=basemap]').forEach(el=>el.onchange=()=>setBasemap(el.value));
  $$('[data-lens]').forEach(el=>el.onclick=()=>{
    $$('[data-lens]').forEach(x=>x.classList.toggle('active',x===el));
    const lens=el.dataset.lens;urbanLens=lens;updateUrban(urbanState);
    for(const key of Object.keys(active))showLayer(key,['boroughs',...({urban:['buildings','places'],energy:['energy'],buildings:['buildings'],mobility:['subway']}[lens])].includes(key));
    $('#map-summary').innerHTML=`<strong>${{urban:'Índice ponderado',energy:'Electricidad 2023',buildings:'Edificación',mobility:'Movilidad'}[lens]}</strong><br><small>Escala relativa 0–100 en nueve celdas.</small><br>`+urbanSummary(urbanState?.primary);
  });
  $('#analyze-point').onclick=()=>{analyze=!analyze;$('#analyze-point').setAttribute('aria-pressed',String(analyze));if(!analyze)map.getSource('analysis-radius').setData(collection([]));};
  $('#toggle-3d').onclick=()=>{const on=map.getPitch()<10;map.easeTo({pitch:on?55:0,bearing:on?-25:0,duration:700});$('#toggle-3d').setAttribute('aria-pressed',String(on));};
  $('#map-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#map-shell').requestFullscreen();map.resize();}catch{toast('Este navegador no permite pantalla completa.');}};
  document.addEventListener('fullscreenchange',()=>map.resize());
  const viewCity=()=>{map.fitBounds([[-74.27,40.49],[-73.69,40.93]],{padding:{left:window.innerWidth>700&&!explorer.hidden?300:30,right:30,top:90,bottom:70},pitch:0,bearing:0,duration:900});$('#toggle-3d').setAttribute('aria-pressed','false');};
  $('#view-city').onclick=viewCity;
  $('#reset-map').onclick=()=>{urbanLens='urban';$$('[data-lens]').forEach(el=>el.classList.toggle('active',el.dataset.lens==='urban'));updateUrban(urbanState);Object.keys(active).forEach(key=>showLayer(key,['boroughs','buildings'].includes(key)));setBasemap('satellite');map.flyTo({center:[-73.9855,40.754],zoom:14.65,pitch:55,bearing:-25});map.getSource('analysis-radius').setData(collection([]));popup?.remove();$('#toggle-3d').setAttribute('aria-pressed','true');$('#map-summary').innerHTML=`<strong>Midtown Manhattan</strong><br><small>${fmt(buildingRendered)} edificios con altura válida.</small>`;};
  $('#share-map').onclick=async()=>{const center=map.getCenter();const url=new URL(location.href);url.hash='gemelo';url.searchParams.set('lat',center.lat.toFixed(5));url.searchParams.set('lng',center.lng.toFixed(5));url.searchParams.set('zoom',map.getZoom().toFixed(2));url.searchParams.set('pitch',map.getPitch().toFixed(0));url.searchParams.set('base',base);url.searchParams.set('layers',Object.keys(active).filter(k=>active[k]).join(','));try{await navigator.clipboard.writeText(url.href);toast('Enlace a esta vista copiado');}catch{toast('No se pudo copiar el enlace. Revisa el permiso de portapapeles.');}};
  function flyPlace(place){popup?.remove();map.flyTo({center:place.coordinates,zoom:15.3,pitch:55,bearing:-25,padding:{left:window.innerWidth>700&&!explorer.hidden?180:0},duration:1300});showLayer('places',true);popup=new maplibregl.Popup({offset:15}).setLngLat(place.coordinates).setHTML(`<h3>${esc(place.name)}</h3>${esc(place.type)} · ${esc(place.borough)}<br><a href="${esc(place.source)}" target="_blank" rel="noopener">Fuente del lugar ↗</a>`).addTo(map);if(window.innerWidth<700)toggleExplorer(false);}
  function flyFeature(feature){popup?.remove();map.fitBounds(bounds(feature.geometry),{padding:{left:window.innerWidth>700&&!explorer.hidden?310:25,right:30,top:100,bottom:70},pitch:0,bearing:0,duration:1000});if(feature.properties.ntaname)showLayer('neighborhoods',true);$('#map-summary').innerHTML=`<strong>${esc(feature.properties.ntaname||feature.properties.boroname)}</strong><br><small>${feature.properties.ntaname?ntaSummary(feature.properties.nta2020):'Datos comparables disponibles en Gente y Atlas.'}</small>`;$('#toggle-3d').setAttribute('aria-pressed','false');if(window.innerWidth<700)toggleExplorer(false);}
  function flyBorough(name){const f=boroData.features.find(x=>x.properties.boroname===name);if(f)flyFeature(f);}
  function featureHtml(f){
    const p=f.properties;
    if(f.layer.id==='urban-fill')return urbanSummary(p.id);
    if(f.layer.id==='buildings-fill')return `<h3>Edificio ${esc(p.bin)}</h3>Altura: ${fmt(+p.height_roof*.3048,1)} m<br>Año registrado: ${esc(p.construction_year)}<br><small>NYC OTI · altura publicada en pies, convertida a metros. Solo recorte Midtown.</small>`;
    if(f.layer.id.startsWith('boroughs'))return `<h3>${esc(p.boroname)}</h3>${fmt(+p.population)} habitantes · PEP 2025<br>${fmt(+p.density)} hab./km²<br>Ingreso del hogar: US$ ${fmt(+p.income)}<br><small>U.S. Census · ACS 2020–2024 / PEP 2025</small>`;
    if(f.layer.id.startsWith('neighborhoods'))return `<h3>${esc(p.ntaname)}</h3>${esc(p.nta2020)} · ${esc(p.boroname)}<br><small>${ntaSummary(p.nta2020)}<br>NYC DCP · NTA 2020. Fuentes, cobertura y márgenes de error en Atlas → Barrios.</small>`;
    if(f.layer.id.startsWith('parks'))return `<h3>${esc(p.signname||p.name311||'Propiedad Parks')}</h3>${esc(p.typecategory||'')}<br>${fmt(+p.acres*.404686,2)} ha inventariadas<br><small>NYC Parks · Conteo de parcela administrativa; no equivale a cobertura arbórea continua ni canopia.</small>`;
    if(f.layer.id==='subway-point')return `<h3>${esc(p.name)}</h3>Líneas: ${esc(p.routes)}<br>Accesibilidad: ${p.ada==='1'?'Totalmente accesible (ADA 1)':p.ada==='2'?'Accesibilidad parcial (ADA 2)':'No accesible según registro (ADA 0)'}<br><small>MTA · Datos oficiales de accesibilidad ADA</small>`;
    if(f.layer.id==='energy-point')return `<h3>${esc(p.name)}</h3>EUI: ${esc(p.eui)} kBtu/pie²<br>Electricidad: ${Number.isFinite(+p.kwh)?fmt(+p.kwh):'No disponible'} kWh<br><small>NYC DOB · LL84 2023. Datos declarados; no medidor en vivo.</small>`;
    return `<h3>${esc(p.name)}</h3>${esc(p.borough||'')}<br>${esc(p.type||'')}<br><small>${f.layer.id.startsWith('health')?'NYC Health + Hospitals':f.layer.id.startsWith('culture')?'NYC DCLA':'Hito georreferenciado'}</small>`;
  }
  map.on('click',e=>{
    popup?.remove();const ids=['health-point','subway-point','energy-point','culture-point','places-point','buildings-fill','parks-fill','urban-fill','neighborhoods-fill','boroughs-fill'];
    const visible=ids.filter(id=>map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none');
    const features=map.queryRenderedFeatures(e.point,{layers:visible});features.sort((a,b)=>ids.indexOf(a.layer.id)-ids.indexOf(b.layer.id));
    const zone=features.find(f=>f.layer.id==='urban-fill');if(zone){onUrbanSelect?.(zone.properties.id);urbanState={...urbanState,primary:zone.properties.id};updateUrban(urbanState);$('#map-summary').innerHTML=urbanSummary(zone.properties.id);}
    if(features[0])popup=new maplibregl.Popup({maxWidth:'280px'}).setLngLat(e.lngLat).setHTML(featureHtml(features[0])).addTo(map);
    if(analyze){
      const center=[e.lngLat.lng,e.lngLat.lat];
      map.getSource('analysis-radius').setData(radius(center,[500,1000]));
      const counts=[['Estaciones MTA',subway],['Centros H+H',health],['Organizaciones DCLA',culture]].map(([name,data])=>[name,data.features.filter(f=>distance(center,f.geometry.coordinates)<=1000).length]);
      const minDistance=fc=>{
        if(!fc?.features?.length)return null;
        let min=Infinity;
        for(const f of fc.features){
          const d=distance(center,f.geometry.coordinates);
          if(d<min)min=d;
        }
        return min===Infinity?null:min;
      };
      const dSubway=minDistance(subway);
      const dHealth=minDistance(health);
      const dCulture=minDistance(culture);
      const distInfo=`<small>Distancia al más cercano: ${dSubway!=null?`${Math.round(dSubway)} m a metro`:'sin metro'} · ${dHealth!=null?`${Math.round(dHealth)} m a H+H`:'sin H+H'} · ${dCulture!=null?`${Math.round(dCulture)} m a DCLA`:'sin DCLA'}</small>`;
      $('#map-summary').innerHTML=(zone?urbanSummary(zone.properties.id)+'<hr>':'')+`<strong>Entorno de 1 km</strong><br><small>${counts.map(([n,c])=>`${fmt(c)} ${n}`).join(' · ')}</small><br>${distInfo}`;
    }
  });
  map.on('mousemove',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['places-point','health-point','subway-point','culture-point','energy-point','buildings-fill']});map.getCanvas().style.cursor=f.length?'pointer':analyze?'crosshair':'grab';});
  const params=new URLSearchParams(location.search);
  if(params.has('lat')&&params.has('lng')){const center=[Number(params.get('lng')),Number(params.get('lat'))];if(valid(center))map.jumpTo({center,zoom:Math.min(19,Math.max(9,Number(params.get('zoom'))||14)),pitch:Math.min(70,Math.max(0,Number(params.get('pitch'))||0))});const type=params.get('base');if(['satellite','streets','plain'].includes(type))setBasemap(type);if(params.has('layers')){const requested=params.get('layers').split(',');Object.keys(active).forEach(key=>showLayer(key,requested.includes(key)));}}
  const atlas=new maplibregl.Map({container:'atlas-map',style:{version:8,sources:{boroughs:{type:'geojson',data:boroData}},layers:[{id:'background',type:'background',paint:{'background-color':'#12252c'}},{id:'atlas-fill',type:'fill',source:'boroughs',paint:{'fill-color':'#80dcd0','fill-opacity':.8}},{id:'atlas-line',type:'line',source:'boroughs',paint:{'line-color':'#14272c','line-width':2}}]},bounds:[[-74.27,40.49],[-73.69,40.93]],fitBoundsOptions:{padding:20},attributionControl:false});
  atlas.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  atlas.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'NYC DCP · Census'}));
  atlas.on('click','atlas-fill',e=>{const f=e.features?.[0];if(f)onSelect(f.properties.boroname);});
  atlas.on('mouseenter','atlas-fill',()=>atlas.getCanvas().style.cursor='pointer');atlas.on('mouseleave','atlas-fill',()=>atlas.getCanvas().style.cursor='');
  let atlasReady=false,lastMetric='density',lastSelected='Manhattan';
  function updateAtlas(metric,selected){
    lastMetric=metric;lastSelected=selected;if(!atlasReady)return;
    const values=boroughs.map(b=>b[metric]),lo=Math.min(...values),hi=Math.max(...values);
    atlas.setPaintProperty('atlas-fill','fill-color',['interpolate',['linear'],['get',metric],lo,'#b7e3db',hi,'#d77858']);
    atlas.setPaintProperty('atlas-line','line-color',['case',['==',['get','boroname'],selected],'#fff1d0','#17333d']);
    atlas.setPaintProperty('atlas-line','line-width',['case',['==',['get','boroname'],selected],3,1]);
  }
  atlas.on('load',()=>{atlasReady=true;updateAtlas(lastMetric,lastSelected);$('#atlas-map').dataset.mapReady='true';});
  return {showLayer,setBasemap,viewCity,flyPlace,flyFeature,flyBorough,updateAtlas,updateUrban,flyUrban,resize(){map.resize();atlas.resize();}};
}
