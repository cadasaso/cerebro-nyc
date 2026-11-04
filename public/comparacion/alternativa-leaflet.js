(async () => {
  const $ = id => document.getElementById(id);
  const format = n => n.toLocaleString('es-CO');
  try {
    const [data, geometry] = await Promise.all(['/data/toolComparison.json', '/data/boroughs.json'].map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw Error('No se pudo cargar ' + url);
      return response.json();
    }));
    const totals = new Map(data.rows.map(row => [row.borough, row.population]));
    const names = geometry.features.map(feature => feature.properties.boroname);
    if (names.length !== 5 || new Set(names).size !== 5 || names.some(name => !totals.has(name))) {
      throw Error('La union territorial no es exacta.');
    }
    const map = L.map('map', { zoomSnap: 0.1 });
    const style = feature => ({ color: '#49616a', weight: 1.5, fillOpacity: 0.85,
      fillColor: `hsl(174, 55%, ${88 - totals.get(feature.properties.boroname) / 3000000 * 58}%)` });
    const polygons = L.geoJSON(geometry, {
      style,
      onEachFeature(feature, layer) {
        const name = feature.properties.boroname;
        layer.bindTooltip(name + ': ' + format(totals.get(name)));
        layer.on('click', () => select(name));
      }
    }).addTo(map);
    map.fitBounds(polygons.getBounds(), { padding: [16, 16] });
    new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      map.fitBounds(polygons.getBounds(), { padding: [16, 16], animate: false });
    }).observe($('map'));
    map.attributionControl.addAttribution('Limites NYC DCP | Censo 2020');
    function select(name) {
      $('borough').value = name;
      $('selection').textContent = name ? name + ': ' + format(totals.get(name)) + ' habitantes.' : 'Total NYC: ' + format(data.total) + ' habitantes.';
      polygons.eachLayer(layer => {
        const selected = layer.feature.properties.boroname === name;
        layer.setStyle({ ...style(layer.feature), color: selected ? '#b55c00' : '#49616a', weight: selected ? 4 : 1.5 });
      });
      document.documentElement.dataset.selectedBorough = name;
    }
    for (const row of data.rows) $('borough').add(new Option(row.borough, row.borough));
    $('borough').addEventListener('change', event => select(event.target.value));
    $('values').innerHTML = data.rows.map(row => `<tr><th>${row.borough}</th><td>${format(row.population)}</td></tr>`).join('') + `<tr><th>Total NYC</th><td>${format(data.total)}</td></tr>`;
    select('');
    $('status').textContent = '5 poligonos | 8.804.190 habitantes | SVG local, sin teselas externas.';
    document.documentElement.dataset.leafletReady = 'true';
  } catch (error) {
    $('status').textContent = error.message;
    document.documentElement.dataset.comparisonError = 'true';
  }
})();
