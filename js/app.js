(async function () {
  const CELL = 7;          // px per grid cell
  const W = window.innerWidth;
  const H = window.innerHeight;

  const svg = d3.select('#map').attr('width', W).attr('height', H);
  const g   = svg.append('g');

  // Load TopoJSON (local file — serve with a local HTTP server)
  let us;
  try {
    us = await d3.json('data/us-states.json');
  } catch (e) {
    document.getElementById('loading').textContent =
      'Could not load map data. Run: python3 -m http.server 8080';
    return;
  }

  const statesGeo = topojson.feature(us, us.objects.states);
  const nationGeo = topojson.feature(us, us.objects.nation);

  // Projection — Albers USA, scaled to fill viewport nicely
  const scale = Math.min(W, H) * 1.45;
  const projection = d3.geoAlbersUsa()
    .scale(scale)
    .translate([W / 2, H / 2]);

  const path = d3.geoPath().projection(projection);

  // Build state lookup with bounding boxes for fast rejection, sorted
  // largest-first for faster average lookup (see js/lookup.js).
  const stateLookup = buildStateLookup(
    statesGeo.features, d3.geoBounds, FIPS_TO_STATE, STATE_SOVEREIGNTY,
  );

  // Build grid
  const cells = [];
  for (let px = 0; px < W; px += CELL) {
    for (let py = 0; py < H; py += CELL) {
      const lonlat = projection.invert([px + CELL / 2, py + CELL / 2]);
      if (!lonlat) continue;
      const key = findSequence(stateLookup, lonlat, d3.geoContains, getSubstateKey);
      if (key) cells.push({ px, py, key });
    }
  }

  // Determine which sequences are actually present (in order of appearance)
  const present = [...new Set(cells.map(c => c.key))];

  // Draw cells
  g.selectAll('rect.cell')
    .data(cells)
    .join('rect')
    .attr('class', 'cell')
    .attr('x', d => d.px)
    .attr('y', d => d.py)
    .attr('width',  CELL - 1)
    .attr('height', CELL - 1)
    .attr('fill',   d => SEQUENCE_COLORS[d.key] || '#888')
    .on('mouseenter', showTip)
    .on('mousemove',  moveTip)
    .on('mouseleave', hideTip);

  // State border overlay
  g.append('g').attr('class', 'borders')
    .selectAll('path')
    .data(statesGeo.features)
    .join('path')
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.13)')
    .attr('stroke-width', 0.7)
    .attr('pointer-events', 'none');

  // Nation outline
  g.append('path')
    .datum(nationGeo)
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.25)')
    .attr('stroke-width', 1.2)
    .attr('pointer-events', 'none');

  // Zoom + pan
  const zoom = d3.zoom()
    .scaleExtent([0.5, 32])
    .on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);

  // Fit to window on resize
  window.addEventListener('resize', () => location.reload());

  // Legend
  const legend = document.getElementById('legend');
  present.forEach(key => {
    const info = SEQUENCE_INFO[key] || { label: key };
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="swatch" style="background:${SEQUENCE_COLORS[key] || '#888'}"></div>
      <div class="legend-label">${info.label || key}</div>
    `;
    legend.appendChild(item);
  });

  // Tooltip
  function showTip(event, d) {
    const tip  = document.getElementById('tooltip');
    const info = SEQUENCE_INFO[d.key] || { label: d.key, desc: '' };
    tip.innerHTML = `<div class="seq">${info.label}</div><div class="desc">${info.desc}</div>`;
    tip.style.display = 'block';
    moveTip(event);
  }
  function moveTip(event) {
    const tip = document.getElementById('tooltip');
    const x = event.clientX + 14;
    const y = event.clientY - 10;
    tip.style.left = Math.min(x, W - 330) + 'px';
    tip.style.top  = Math.max(y, 8) + 'px';
  }
  function hideTip() {
    document.getElementById('tooltip').style.display = 'none';
  }

  document.getElementById('loading').style.display = 'none';
})();
