// The blue CARY letters that stand on the sidewalk outside Conscious Cup
// Coffee, at Main and Spring. Four freestanding capitals, about waist high,
// bolted to small plates, with a warm uplight at the foot of each.
//
// Modelled from a user photograph (2026-09-20). The letters are built from
// extruded outlines rather than a font, so nothing depends on what typefaces
// a browser happens to have.
import * as THREE from 'three';
import { mat } from './kit.js';

const BLUE = '#1f47c8', PLATE = '#2b2f36';
const HEIGHT = 1.28;       // cap height
const DEPTH = 0.3;         // how far the letters stand proud
const STROKE = 0.3;        // stroke width, as a fraction of cap height

/**
 * Letter outlines in a 0..1 box (x right, y up), drawn as chunky sans-serif
 * capitals. Each returns an array of THREE.Path-able shapes.
 */
function letterShapes(letter) {
  const s = STROKE, shapes = [];
  const poly = (...pts) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) shape.lineTo(p[0], p[1]);
    shape.closePath();
    return shape;
  };
  const holePath = (...pts) => {
    const path = new THREE.Path();
    path.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) path.lineTo(p[0], p[1]);
    path.closePath();
    return path;
  };
  if (letter === 'C') {
    // An open ring: an outer arc swept back along an inner one, terminals to the right.
    const ring = new THREE.Shape();
    ring.absarc(0.5, 0.5, 0.5, -Math.PI * 0.3, Math.PI * 0.3, true);
    ring.absarc(0.5, 0.5, 0.5 - s, Math.PI * 0.3, -Math.PI * 0.3, false);
    ring.closePath();
    shapes.push(ring);
  } else if (letter === 'A') {
    // Silhouette with a real triangular counter, plus the crossbar.
    const a = poly([0, 0], [0.27, 0], [0.5, 0.74], [0.73, 0], [1, 0], [0.6, 1], [0.4, 1]);
    a.holes.push(holePath([0.5, 0.86], [0.38, 0.5], [0.62, 0.5]));
    shapes.push(a);
    shapes.push(poly([0.255, 0.28], [0.745, 0.28], [0.745, 0.28 + s * 0.62], [0.255, 0.28 + s * 0.62]));
  } else if (letter === 'R') {
    // Stem, a bowl with a rectangular counter, and a straight leg.
    shapes.push(poly([0, 0], [s, 0], [s, 1], [0, 1]));
    const bowl = poly([s, 0.47], [0.66, 0.47], [0.78, 0.6], [0.78, 0.87], [0.66, 1], [s, 1]);
    bowl.holes.push(holePath([s + 0.02, 0.65], [0.5, 0.65], [0.58, 0.72], [0.58, 0.78], [0.5, 0.85], [s + 0.02, 0.85]));
    shapes.push(bowl);
    shapes.push(poly([s, 0.5], [s + 0.2, 0.5], [0.95, 0], [0.72, 0]));
  } else if (letter === 'Y') {
    shapes.push(poly([0, 1], [s * 0.92, 1], [0.5 + s * 0.2, 0.42], [0.5 - s * 0.36, 0.42]));
    shapes.push(poly([1 - s * 0.92, 1], [1, 1], [0.5 + s * 0.36, 0.42], [0.5 - s * 0.2, 0.42]));
    shapes.push(poly([0.5 - s / 2, 0], [0.5 + s / 2, 0], [0.5 + s / 2, 0.5], [0.5 - s / 2, 0.5]));
  }
  return shapes;
}

function letterMesh(letter, material) {
  const group = new THREE.Group();
  for (const shape of letterShapes(letter)) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 14,
    });
    geometry.scale(HEIGHT, HEIGHT, 1);
    group.add(new THREE.Mesh(geometry, material));
  }
  group.name = `cary-letter-${letter}`;
  return group;
}

/**
 * The letters. `feature.pts[0]` is the left-hand end of the run and
 * `feature.angle` turns the row so it faces the street.
 */
export function buildCaryLetters(feature, grade = () => 0) {
  const root = new THREE.Group(); root.name = 'cary-letters';
  const [x, z] = feature.pts[0], angle = feature.angle ?? 0, ground = grade(x, z);
  root.position.set(x, ground, z); root.rotation.y = angle;

  const material = mat(BLUE, { roughness: 0.42 });
  material.name = 'cary-letters-blue';
  const text = 'CARY';
  const width = HEIGHT * 0.96, gap = HEIGHT * 0.16;
  const pitch = width + gap;
  const total = pitch * text.length - gap;

  for (let i = 0; i < text.length; i++) {
    const letter = letterMesh(text[i], material);
    const offset = -total / 2 + i * pitch;
    letter.position.set(offset, 0.02, -DEPTH / 2);
    root.add(letter);
    // A small base plate under each letter, and a warm uplight washing it.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.04, DEPTH + 0.14), mat(PLATE, { roughness: 0.6 }));
    plate.position.set(offset + width / 2, 0.02, 0);
    root.add(plate);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 8), mat('#f2e3b8', { roughness: 0.3 }));
    lamp.position.set(offset + width / 2, 0.055, DEPTH / 2 + 0.12);
    root.add(lamp);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
