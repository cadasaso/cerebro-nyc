// Transcripcion de tablas oficiales consultadas el 23-09-2026.
// PEP 2025, Censo 2020 y ACS 2020-2024 son productos distintos.
const rows = [
  ['Manhattan','New York','061',1664862,1694251,1585873,22.66,12.9,18.7,53,28.2,25.1,1090500,2197,778281,2,36.9,92.4,64.2,5.2,31.2,103931,15.5,93904,2322720,[-73.9855,40.758]],
  ['Bronx','Bronx','005',1406332,1472654,1385108,42.17,23.5,15.7,53.2,34.6,20.1,529500,1458,534100,2.53,57,86.8,22.4,8.1,43.3,48676,28.7,18674,285540,[-73.8648,40.8448]],
  ['Brooklyn','Kings','047',2653963,2736074,2504700,69.38,20.7,15.8,52.6,35.3,29.5,905000,1833,1009927,2.56,44.6,89.5,42.1,6.6,41.7,80263,19.2,62317,745880,[-73.9496,40.6501]],
  ['Queens','Queens','081',2358182,2405464,2230722,108.72,18.2,18.4,51.6,47.6,44.9,723800,1956,841003,2.72,55.4,92.3,36.1,8.4,42.9,86136,13.4,51188,616045,[-73.7949,40.7282]],
  ['Staten Island','Richmond','085',501290,495747,468730,57.52,20.4,19.3,51.6,25.8,67.7,675500,1733,170777,2.85,36.9,91.1,35.7,5.2,43.1,98333,11.5,9684,115371,[-74.15,40.5795]]
];
export const boroughs=rows.map(([name,county,fips,population,census2010a,pop2010,areaMi,under18,over65,female,foreign,owner,homeValue,rent,households,householdSize,language,broadband,degree,uninsured,commute,income,poverty,companies,jobs,center],i)=>({
  name,county,fips,population,pop2020:census2010a,pop2010,area:areaMi*2.58998811,under18,over65,female,foreign,owner,homeValue,rent,households,householdSize,language,broadband,degree,uninsured,commute,income,poverty,companies,jobs,center,
  code:i+1,density:population/(areaMi*2.58998811),source:`https://www.census.gov/quickfacts/fact/table/${county.toLowerCase().replaceAll(' ','')}countynewyork/PST045225`
}));
export const city={population:8584629,pop2020:8804190,pop2010:8175133,area:300.45*2.58998811,under18:20.2,over65:16.6,female:52,foreign:36.6,owner:32.8,homeValue:777600,rent:1821,households:3334088,householdSize:2.48,language:47.7,broadband:90.5,degree:41.6,uninsured:7.2,commute:40.3,income:80483,poverty:17.9};
export const censusSource='https://www.census.gov/quickfacts/fact/table/newyorkcitynewyork/PST045225';
export const tourismSource='https://www.business.nyctourism.com/es/press-media/press-releases/NYC-Tourism-Annual-Report-March-2026';
export const budgetSource='https://comptroller.nyc.gov/reports/comments-on-new-york-citys-fiscal-year-2026-adopted-budget/';
export const places=[
  {name:'Times Square',coordinates:[-73.9855,40.758],type:'Espacio urbano',borough:'Manhattan',source:'https://www.timessquarenyc.org/'},
  {name:'Empire State Building',coordinates:[-73.9857,40.7484],type:'Arquitectura',borough:'Manhattan',source:'https://www.esbnyc.com/'},
  {name:'Central Park',coordinates:[-73.9654,40.7829],type:'Parque',borough:'Manhattan',source:'https://www.centralparknyc.org/'},
  {name:'The Metropolitan Museum of Art',coordinates:[-73.9632,40.7794],type:'Museo',borough:'Manhattan',source:'https://www.metmuseum.org/'},
  {name:'Estatua de la Libertad',coordinates:[-74.0445,40.6892],type:'Patrimonio',borough:'Manhattan',source:'https://www.nps.gov/stli/'},
  {name:'Brooklyn Bridge',coordinates:[-73.9969,40.7061],type:'Arquitectura',borough:'Brooklyn',source:'https://www.nyc.gov/html/dot/html/infrastructure/brooklyn-bridge.shtml'},
  {name:'Prospect Park',coordinates:[-73.968,40.6602],type:'Parque',borough:'Brooklyn',source:'https://www.prospectpark.org/'},
  {name:'Coney Island',coordinates:[-73.978,40.574],type:'Costa',borough:'Brooklyn',source:'https://www.nycgovparks.org/parks/coney-island-beach-and-boardwalk'},
  {name:'Flushing Meadows Corona Park',coordinates:[-73.8458,40.7397],type:'Parque',borough:'Queens',source:'https://www.nycgovparks.org/parks/flushing-meadows-corona-park'},
  {name:'Yankee Stadium',coordinates:[-73.9262,40.8296],type:'Deporte',borough:'Bronx',source:'https://www.mlb.com/yankees/ballpark'},
  {name:'New York Botanical Garden',coordinates:[-73.8801,40.8624],type:'Jardin botanico',borough:'Bronx',source:'https://www.nybg.org/'},
  {name:'St. George Ferry Terminal',coordinates:[-74.0736,40.6437],type:'Transporte',borough:'Staten Island',source:'https://www.nyc.gov/html/dot/html/ferrybus/staten-island-ferry.shtml'}
];
export const manualSources=[
  {key:'census',name:'Poblacion, vivienda y condiciones de vida',agency:'U.S. Census Bureau',theme:'gente',period:'PEP 2025 / ACS 2020-2024 / censos 2010 y 2020',source:censusSource,method:'Transcripcion de QuickFacts. Estimaciones y conteos se distinguen. Cada borough conserva su URL.',status:'verificado',tested:'2026-10-26'},
  {key:'tourism',name:'Balance anual del turismo 2025',agency:'NYC Tourism + Conventions',theme:'turismo',period:'2025; publicado marzo 2026',source:tourismSource,method:'Transcripcion de informe oficial. Cifras anuales consolidadas para toda la ciudad; desglosa ocio/negocios y procedencia.',status:'verificado',tested:'2026-10-26'},
  {key:'budget',name:'Presupuesto y finanzas municipales',agency:'NYC Comptroller / OMB',theme:'municipio',period:'FY2022–FY2026; adoptado, modificado y ejecutado',source:budgetSource,method:'Transcripción de informes ACFR de Contraloría y OMB. Se diferencia año fiscal de año calendario y etapas presupuestales.',status:'verificado',tested:'2026-10-26'},
  {key:'weather',name:'Pronostico meteorologico',agency:'Open-Meteo',theme:'ambiente',period:'consulta en vivo',source:'https://open-meteo.com/en/docs',method:'Modelo meteorologico numerico (GFS/ECMWF), no medicion directa de estacion local. Se muestra hora de la consulta.',status:'conexion en vivo',tested:'2026-10-26'},
  {key:'basemap',name:'Mapa base y satelite',agency:'OpenStreetMap / Esri',theme:'geo',period:'mosaico multifecha (2021–2024)',source:'https://www.openstreetmap.org/copyright',method:'Teselas externas con atribucion. Esri World Imagery es mosaico multifecha de resolución submétrica; no imagen en vivo de hoy.',status:'conexion en vivo',tested:'2026-10-26'},
  {key:'censusApi',name:'API ACS del Census Bureau',agency:'U.S. Census Bureau',theme:'gente',period:'ACS 2024',source:'https://api.census.gov/data/2024/acs/acs5.html',method:'Consulta sin clave redirigio a missing_key. Se empleo la tabla publica QuickFacts y NYC FactFinder; no se invento una piramide quinquenal.',status:'requiere clave',tested:'2026-10-26'},
  {key:'places',name:'Selección de hitos para el recorrido',agency:'Equipo Cerebro NYC con páginas institucionales',theme:'territorio',period:'Selección del corte 2026-09-23',source:'https://www.timessquarenyc.org/',method:'Curación de 12 lugares para búsqueda y recorrido. No es un censo turístico; cada hito conserva su enlace institucional.',status:'verificado',tested:'2026-10-26'}
];

export const config = {
  testedDate: '2026-10-26',
  acsPeriod: 'ACS 2020–2024',
  censusPeriod: 'Censo 2020',
  pepPeriod: 'PEP 2025',
  budgetFiscalYear: 'FY2026',
  tourismPeriod: '2025 (publicado marzo 2026)',
  airQualityPeriod: 'NYCCAS 2024',
  metaTitle: 'Cerebro NYC · Observatorio Urbano Territorial'
};

export const historicalPopulation = [
  {year: '1950', nyc: 7891957, manhattan: 1960101, bronx: 1451277, brooklyn: 2738175, queens: 1550849, statenIsland: 191555},
  {year: '1960', nyc: 7781984, manhattan: 1698281, bronx: 1424815, brooklyn: 2627319, queens: 1809578, statenIsland: 221991},
  {year: '1970', nyc: 7894862, manhattan: 1539233, bronx: 1471701, brooklyn: 2602012, queens: 1986473, statenIsland: 295443},
  {year: '1980', nyc: 7071639, manhattan: 1428285, bronx: 1168972, brooklyn: 2230936, queens: 1891325, statenIsland: 352121},
  {year: '1990', nyc: 7322564, manhattan: 1487536, bronx: 1203789, brooklyn: 2300664, queens: 1951598, statenIsland: 378977},
  {year: '2000', nyc: 8008278, manhattan: 1537195, bronx: 1332650, brooklyn: 2465326, queens: 2229379, statenIsland: 443728},
  {year: '2010', nyc: 8175133, manhattan: 1585873, bronx: 1385108, brooklyn: 2504700, queens: 2230722, statenIsland: 468730},
  {year: '2020', nyc: 8804190, manhattan: 1694251, bronx: 1472654, brooklyn: 2736074, queens: 2405464, statenIsland: 495747},
  {year: '2025', nyc: 8584629, manhattan: 1664862, bronx: 1406332, brooklyn: 2653963, queens: 2358182, statenIsland: 501290}
];

export const raceEthnicity = {
  city: {hispanic: 28.3, whiteNonHisp: 30.9, blackNonHisp: 20.2, asianNonHisp: 15.6, otherOrMulti: 5.0},
  boroughs: {
    Manhattan: {hispanic: 25.1, whiteNonHisp: 46.8, blackNonHisp: 11.8, asianNonHisp: 13.0, otherOrMulti: 3.3},
    Bronx: {hispanic: 54.8, whiteNonHisp: 8.9, blackNonHisp: 28.5, asianNonHisp: 4.6, otherOrMulti: 3.2},
    Brooklyn: {hispanic: 18.9, whiteNonHisp: 35.4, blackNonHisp: 26.7, asianNonHisp: 13.6, otherOrMulti: 5.4},
    Queens: {hispanic: 27.8, whiteNonHisp: 22.8, blackNonHisp: 15.9, asianNonHisp: 27.3, otherOrMulti: 6.2},
    'Staten Island': {hispanic: 19.6, whiteNonHisp: 56.1, blackNonHisp: 9.9, asianNonHisp: 11.0, otherOrMulti: 3.4}
  }
};

export const tourismSeries = {
  years: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  domestic: [53.1, 19.9, 30.2, 46.6, 50.6, 51.9, 52.4],
  international: [13.5, 2.4, 2.7, 9.4, 11.6, 12.6, 12.6],
  total: [66.6, 22.3, 32.9, 56.0, 62.2, 64.5, 65.0],
  occupancy: [88.4, 46.2, 59.5, 74.8, 81.6, 83.0, 84.2],
  adr: [255, 152, 198, 278, 301, 318, 334],
  provenance: [
    {country: 'Reino Unido', visitors: 1.22},
    {country: 'Canadá', visitors: 1.05},
    {country: 'Francia', visitors: 0.74},
    {country: 'Brasil', visitors: 0.66},
    {country: 'Alemania', visitors: 0.61},
    {country: 'Italia', visitors: 0.53},
    {country: 'México', visitors: 0.49},
    {country: 'Australia', visitors: 0.41}
  ]
};

export const budgetSeries = {
  years: ['FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026'],
  adopted: [98.7, 101.1, 107.1, 112.4, 115.91],
  modified: [106.4, 110.6, 114.3, 115.8, 115.91],
  actual: [102.8, 107.3, 112.4, 114.7, null],
  capitalSectors: [
    {sector: 'Educación y escuelas (DOE/SCA)', amount: 5.85},
    {sector: 'Transporte y puentes (DOT)', amount: 4.12},
    {sector: 'Medio ambiente y aguas (DEP)', amount: 3.98},
    {sector: 'Vivienda y NYCHA (HPD)', amount: 3.25},
    {sector: 'Parques y recreación (Parks)', amount: 1.65},
    {sector: 'Seguridad (NYPD/FDNY/DOC)', amount: 1.84},
    {sector: 'Saneamiento y otros servicios', amount: 3.59}
  ]
};

export const airQualityData = {
  pollutants: [
    {name: 'PM2.5 (partículas finas)', value: 6.5, unit: 'µg/m³', benchmark: 'Meta OMS: 5.0 · EPA: 9.0', trend: '-40 % desde 2009 (eliminación fuelóleo pesado)'},
    {name: 'NO2 (dióxido de nitrógeno)', value: 16.8, unit: 'ppb', benchmark: 'Estándar EPA anual: 53 ppb', trend: 'Mayor en Midtown, Lower Manhattan y ejes viales'},
    {name: 'O3 (ozono estival)', value: 29.5, unit: 'ppb', benchmark: 'Estándar EPA 8h: 70 ppb', trend: 'Picos en días soleados de verano; mayor en costa'},
    {name: 'SO2 (dióxido de azufre)', value: 0.4, unit: 'ppb', benchmark: 'Estándar EPA 1h: 75 ppb', trend: 'Prácticamente erradicado tras prohibición combustibles sucios'}
  ],
  climateRisks: [
    {hazard: 'Inundación costera y marejadas', exposure: 'Litoral de Staten Island, Rockaways (Queens), South Brooklyn y Lower Manhattan (zonas FEMA 100/500 años).', response: 'Programa East Side Coastal Resiliency y barreras costeras.'},
    {hazard: 'Inundación pluvial extrema (Cloudburst)', exposure: 'Saturación del alcantarillado combinado en aguaceros extremos (>50 mm/h).', response: 'Microrreservorios, pavimentos filtrantes y techos verdes.'},
    {hazard: 'Isla de calor urbana', exposure: 'Diferencia de 4–5 °C en South Bronx, Central Brooklyn y Northern Manhattan por escasa cobertura vegetal.', response: 'Iniciativas Cool Neighborhoods NYC y censo de arbolado.'}
  ]
};
