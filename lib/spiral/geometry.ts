import * as THREE from "three";

export const START_YEAR = 1920;
export const YEARS_PER_TURN = 20;
export const TURN_COUNT = 6;
export const INNER_RADIUS = 3;
export const OUTER_RADIUS = 5;
export const STEP_RISE = 0.15;
export const PITCH = STEP_RISE * YEARS_PER_TURN;
export const STEP_DEPTH = 0.3;
export const STEP_GAP = 0.03;
export const STEP_ANGLE = (Math.PI * 2) / YEARS_PER_TURN;

export function decadeIndexOf(year: number) {
  return Math.floor((year - START_YEAR) / YEARS_PER_TURN);
}

export function yearIndexOf(year: number) {
  return ((year - START_YEAR) % YEARS_PER_TURN + YEARS_PER_TURN) % YEARS_PER_TURN;
}

export function stepBaseY(year: number) {
  return decadeIndexOf(year) * PITCH + yearIndexOf(year) * STEP_RISE;
}

export function decadeBaseY(decade: number) {
  return decade * PITCH + ((YEARS_PER_TURN - 1) / 2) * STEP_RISE;
}

/** Clockwise from 12 o'clock (−Z) when viewed from above. */
export function pointOnRing(theta: number, radius: number, y: number) {
  return new THREE.Vector3(Math.sin(theta) * radius, y, -Math.cos(theta) * radius);
}

export function createStepGeometry(yearIndex: number) {
  const theta0 = yearIndex * STEP_ANGLE + STEP_GAP / 2;
  const theta1 = (yearIndex + 1) * STEP_ANGLE - STEP_GAP / 2;
  const phi0 = Math.PI / 2 - theta0;
  const phi1 = Math.PI / 2 - theta1;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, OUTER_RADIUS, phi0, phi1, true);
  shape.absarc(0, 0, INNER_RADIUS, phi1, phi0, false);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: STEP_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}
