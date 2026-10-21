#!/usr/bin/env node
/**
 * Build the route map for the Salt March film from the public-domain Natural
 * Earth TopoJSON already used by the site.
 *
 * Output is a small JSON file with an India outline and a curved Sabarmati →
 * Dandi route. film.html draws it as inline SVG so the route can draw itself
 * frame by frame without shipping a map raster.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPO = path.join(ROOT, 'countries-110m.json');

const VIEW = { w: 1000, h: 1000 };
const BBOX = { minLon: 66, maxLon: 98, minLat: 6, maxLat: 36 };

function decodeArcs(topology) {
  const { scale, translate } = topology.transform;
  return topology.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function ring(points) {
  if (!points.length) return '';
  return 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
}

function project(lon, lat) {
  const x = ((lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon)) * VIEW.w;
  const y = ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat)) * VIEW.h;
  return [x, y];
}

function geomToPaths(geom, arcs, out) {
  if (geom.type === 'Polygon') {
    geom.arcs.forEach((poly) => {
      const pts = [];
      poly.forEach((i) => {
        const arc = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
        arc.forEach((p) => pts.push(p));
      });
      out.push(ring(pts.map(([lon, lat]) => project(lon, lat))));
    });
  } else if (geom.type === 'MultiPolygon') {
    geom.arcs.forEach((poly) => {
      poly.forEach((ringArcs) => {
        const pts = [];
        ringArcs.forEach((i) => {
          const arc = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
          arc.forEach((p) => pts.push(p));
        });
        out.push(ring(pts.map(([lon, lat]) => project(lon, lat))));
      });
    });
  }
}

function curve(a, b, bend = 0.22, steps = 80) {
  const [ax, ay] = a, [bx, by] = b;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const dx = bx - ax, dy = by - ay;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * ax + 2 * u * t * cx + t * t * bx,
      u * u * ay + 2 * u * t * cy + t * t * by
    ]);
  }
  return out;
}

function main() {
  const topology = JSON.parse(fs.readFileSync(TOPO, 'utf8'));
  const arcs = decodeArcs(topology);
  const india = topology.objects.countries.geometries.find(
    (g) => String(g.properties && g.properties.name).toLowerCase() === 'india'
  );
  if (!india) throw new Error('India not found in countries-110m.json');
  const paths = [];
  geomToPaths(india, arcs, paths);
  if (!paths.length) throw new Error('India outline is empty');

  const sabarmati = project(72.58, 23.03);
  const dandi = project(72.75, 20.89);
  const route = curve(sabarmati, dandi, 0.26, 90);
  const routePath = 'M' + route.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L');

  // A few labels in map space. Text is intentionally sparse: the shot is a
  // route, not an atlas.
  const labels = [
    { text: 'SABARMATI', x: sabarmati[0], y: sabarmati[1] - 16, anchor: 'middle' },
    { text: 'DANDI', x: dandi[0], y: dandi[1] + 30, anchor: 'middle' },
    { text: 'ARABIAN SEA', x: 330, y: 690, anchor: 'middle', muted: true },
    { text: 'I N D I A', x: 610, y: 470, anchor: 'middle', muted: true }
  ];

  const out = {
    view: VIEW,
    indiaPath: paths.join(' '),
    routePath,
    routePoints: route,
    sabarmati: { x: sabarmati[0], y: sabarmati[1] },
    dandi: { x: dandi[0], y: dandi[1] },
    labels
  };
  const outDir = process.argv[2] || path.join(ROOT, 'out', 'film', 'salt-march');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'map.json');
  fs.writeFileSync(file, JSON.stringify(out) + '\n');
  console.log(`wrote ${file} (${paths.length} India rings, ${route.length} route points)`);
}

try {
  main();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}
