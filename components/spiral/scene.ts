import * as THREE from "three";
import {
  OUTER_RADIUS,
  PITCH,
  START_YEAR,
  STEP_ANGLE,
  STEP_DEPTH,
  TURN_COUNT,
  YEARS_PER_TURN,
  createStepGeometry,
  decadeBaseY,
  decadeIndexOf,
  pointOnRing,
  stepBaseY,
  yearIndexOf,
} from "@/lib/spiral/geometry";
import type { SpiralPalette } from "@/lib/spiral/palette";
import type { SpiralEvent } from "@/lib/spiral/types";

export type SpiralMode = "overview" | "decade";

export type SpiralView = {
  mode: SpiralMode;
  decade: number;
  year: number | null;
  labelHoverDecade: number | null;
  buttonHoverYear: number | null;
  reducedMotion: boolean;
};

type StepRecord = {
  mesh: THREE.Mesh;
  decade: number;
  year: number;
  baseY: number;
  lift: number;
  opacity: number;
  color: THREE.Color;
  eventColor: THREE.Color | null;
  material: THREE.MeshStandardMaterial;
};

const FOV = 38;

function damp(current: number, target: number, lambda: number, dt: number, snap: boolean) {
  if (snap) return target;
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function distanceFor(fovRad: number, viewAspect: number, worldWidth: number, worldHeight: number) {
  const halfFov = Math.tan(fovRad / 2);
  const distH = worldHeight / 2 / halfFov;
  const distW = worldWidth / 2 / (halfFov * Math.max(viewAspect, 0.35));
  return Math.max(distH, distW) * 1.18;
}

export class SpiralScene {
  readonly view: SpiralView = {
    mode: "overview",
    decade: 0,
    year: null,
    labelHoverDecade: null,
    buttonHoverYear: null,
    reducedMotion: false,
  };

  onSelectDecade: (decade: number) => void = () => {};
  onSelectYear: (year: number) => void = () => {};
  onChangeDecade: (direction: 1 | -1) => void = () => {};

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly pivot = new THREE.Group();
  private readonly steps: StepRecord[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly look = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly palette: SpiralPalette;
  private readonly eventsByYear: Map<number, SpiralEvent[]>;

  private width = 1;
  private height = 1;
  private rotation = 0;
  private targetRotation = 0;
  private pan = 0;
  private targetPan = 0;
  private pointerDecade: number | null = null;
  private pointerYear: number | null = null;
  private dragging = false;
  private moved = 0;
  private lastX = 0;
  private lastY = 0;
  private lastWheel = 0;
  private prevMode: SpiralMode = "overview";
  private prevDecade = 0;
  private armed = false;
  private frame = 0;
  private running = true;
  private decadeButtons: (HTMLButtonElement | null)[] = [];
  private yearButtons: (HTMLButtonElement | null)[] = [];
  private tooltip: HTMLDivElement | null = null;
  private panel: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement, events: SpiralEvent[], palette: SpiralPalette) {
    this.palette = palette;
    this.eventsByYear = new Map();
    for (const event of events) {
      const list = this.eventsByYear.get(event.year) ?? [];
      list.push(event);
      this.eventsByYear.set(event.year, list);
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(palette.background, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120);
    this.scene.add(this.pivot);

    const hemi = new THREE.HemisphereLight(palette.background, palette.neutral, 0.9);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(7, 22, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 48;
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -6;
    this.scene.add(sun);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(OUTER_RADIUS + 0.7, OUTER_RADIUS + 0.7, 0.16, 72),
      new THREE.MeshStandardMaterial({ color: palette.neutral, roughness: 0.92, metalness: 0 }),
    );
    base.position.y = -0.22;
    base.receiveShadow = true;
    this.pivot.add(base);

    const shared: THREE.BufferGeometry[] = [];
    for (let index = 0; index < YEARS_PER_TURN; index += 1) {
      const geometry = createStepGeometry(index);
      shared.push(geometry);
      this.geometries.push(geometry);
    }

    for (let decade = 0; decade < TURN_COUNT; decade += 1) {
      for (let index = 0; index < YEARS_PER_TURN; index += 1) {
        const year = START_YEAR + decade * YEARS_PER_TURN + index;
        const first = this.eventsByYear.get(year)?.[0];
        const material = new THREE.MeshStandardMaterial({
          color: palette.neutral,
          roughness: 0.78,
          metalness: 0.02,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(shared[index], material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.y = stepBaseY(year);
        this.pivot.add(mesh);
        this.steps.push({
          mesh,
          decade,
          year,
          baseY: stepBaseY(year),
          lift: 0,
          opacity: 1,
          color: palette.neutral.clone(),
          eventColor: first ? palette.categories[first.category].clone() : null,
          material,
        });
      }
    }

    this.resize();
    this.snapCamera(true);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.tick(performance.now());
  }

  setElements(elements: {
    decades: (HTMLButtonElement | null)[];
    years: (HTMLButtonElement | null)[];
    tooltip: HTMLDivElement | null;
    panel: HTMLElement | null;
  }) {
    this.decadeButtons = elements.decades;
    this.yearButtons = elements.years;
    this.tooltip = elements.tooltip;
    this.panel = elements.panel;
  }

  resize() {
    const canvas = this.renderer.domElement;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.applyViewOffset();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("wheel", this.onWheel);
    for (const step of this.steps) step.material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.renderer.dispose();
  }

  private onPointerDown = (event: PointerEvent) => {
    this.dragging = true;
    this.moved = 0;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.dragging) {
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.targetRotation += dx * 0.005;
      if (this.view.mode === "overview") this.targetPan -= dy * 0.012;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      return;
    }
    this.hoverAt(event);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved < 6) this.clickAt(event);
    else this.hoverAt(event);
  };

  private onPointerLeave = () => {
    this.pointerDecade = null;
    this.pointerYear = null;
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (this.view.mode === "overview") {
      this.targetPan += event.deltaY * 0.004;
      return;
    }
    const now = performance.now();
    if (now - this.lastWheel < 700) return;
    if (Math.abs(event.deltaY) < 4) return;
    this.lastWheel = now;
    this.onChangeDecade(event.deltaY > 0 ? 1 : -1);
  };

  private hoverAt(event: PointerEvent) {
    const hit = this.pick(event);
    this.pointerDecade = hit?.decade ?? null;
    this.pointerYear = this.view.mode === "decade" ? (hit?.year ?? null) : null;
  }

  private clickAt(event: PointerEvent) {
    const hit = this.pick(event);
    if (!hit) return;
    if (this.view.mode === "overview") this.onSelectDecade(hit.decade);
    else this.onSelectYear(hit.year);
  }

  private pick(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.steps
      .filter((step) => step.mesh.visible && (this.view.mode === "overview" || step.decade === this.view.decade))
      .map((step) => step.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return this.steps.find((step) => step.mesh === hit.object) ?? null;
  }

  private layout() {
    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    const panelRect = this.panel?.getBoundingClientRect();
    let usableWidth = this.width;
    let usableHeight = this.height;
    let offsetX = 0;
    let offsetY = 0;
    if (panelRect && panelRect.width > 0 && panelRect.height > 0) {
      const coversSide = panelRect.left > canvasRect.left + this.width * 0.45;
      if (coversSide) {
        const overlap = Math.max(0, canvasRect.right - panelRect.left);
        usableWidth = Math.max(1, this.width - overlap);
        offsetX = overlap / 2;
      } else if (panelRect.top > canvasRect.top + this.height * 0.4) {
        const overlap = Math.max(0, canvasRect.bottom - panelRect.top);
        usableHeight = Math.max(1, this.height - overlap);
        offsetY = overlap / 2;
      }
    }
    return { usableWidth, usableHeight, offsetX, offsetY };
  }

  private applyViewOffset() {
    const { offsetX, offsetY } = this.layout();
    if (offsetX === 0 && offsetY === 0) this.camera.clearViewOffset();
    else this.camera.setViewOffset(this.width, this.height, offsetX, offsetY, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }

  private desiredCamera(snapLook: boolean) {
    const { usableWidth, usableHeight } = this.layout();
    const aspect = usableWidth / usableHeight;
    const fov = THREE.MathUtils.degToRad(FOV);
    if (this.view.mode === "overview") {
      const span = (TURN_COUNT - 1) * PITCH;
      this.targetPan = THREE.MathUtils.clamp(this.targetPan, -span * 0.55, span * 0.55);
      const mid = span / 2 + this.pan;
      const dist = distanceFor(fov, aspect, 13, span + 4);
      const tilt = THREE.MathUtils.degToRad(15);
      this.desired.set(0, mid + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
      this.desiredLook.set(0, mid, 0);
    } else {
      const y = decadeBaseY(this.view.decade);
      const dist = distanceFor(fov, aspect, OUTER_RADIUS * 2 + 3.6, PITCH + 6.5);
      const tilt = THREE.MathUtils.degToRad(60);
      this.desired.set(0, y + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
      this.desiredLook.set(0, y, 0);
    }
    if (snapLook) {
      this.camera.position.copy(this.desired);
      this.look.copy(this.desiredLook);
    }
  }

  private snapCamera(force: boolean) {
    this.desiredCamera(force);
    if (force) this.camera.lookAt(this.look);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, this.clockDelta(now));
    const snap = this.view.reducedMotion;
    const view = this.view;

    if (this.armed && view.mode === "decade" && this.prevMode === "decade" && view.decade !== this.prevDecade) {
      const direction = view.decade > this.prevDecade ? 1 : -1;
      if (!snap) this.targetRotation += direction * Math.PI * 2;
    }
    this.prevMode = view.mode;
    this.prevDecade = view.decade;
    this.armed = true;

    const hoverDecade = view.labelHoverDecade ?? this.pointerDecade;
    const hoverYear = view.mode === "decade" ? (view.buttonHoverYear ?? this.pointerYear) : null;
    const auto = view.mode === "overview" && hoverDecade == null && !this.dragging && !snap;
    if (auto) this.targetRotation += dt * 0.18;

    this.rotation = damp(this.rotation, this.targetRotation, snap ? 40 : 5, dt, snap);
    this.pan = damp(this.pan, this.targetPan, snap ? 40 : 5, dt, snap);
    this.pivot.rotation.y = this.rotation;

    for (const step of this.steps) {
      let opacity = 1;
      let lift = 0;
      const colored = step.eventColor ?? this.palette.neutral;
      let color = this.palette.neutral;
      if (view.mode === "overview") {
        if (hoverDecade == null) {
          opacity = 1;
        } else if (step.decade === hoverDecade) {
          opacity = 1;
          lift = 0.28;
          color = colored;
        } else {
          opacity = 0.35;
        }
      } else if (step.decade > view.decade) {
        opacity = 0;
      } else if (step.decade === view.decade) {
        opacity = 1;
        color = colored;
        if (step.year === hoverYear) lift = 0.18;
        if (step.year === view.year) lift = 0.48;
      } else if (step.decade === view.decade - 1) {
        opacity = 0.4;
        color = colored;
      } else {
        opacity = 0.15;
        color = colored;
      }
      if ((step.year === hoverYear || (view.mode === "overview" && step.decade === hoverDecade)) && step.eventColor) {
        color = colored.clone().lerp(this.palette.hover, 0.28);
      }
      step.lift = damp(step.lift, lift, snap ? 40 : 8, dt, snap);
      step.opacity = damp(step.opacity, opacity, snap ? 40 : 7, dt, snap);
      step.color.lerp(color, snap ? 1 : 1 - Math.exp(-8 * dt));
      step.mesh.position.y = step.baseY + step.lift;
      step.material.opacity = step.opacity;
      step.material.color.copy(step.color);
      step.material.depthWrite = step.opacity > 0.85;
      step.mesh.visible = step.opacity > 0.02;
    }

    this.applyViewOffset();
    this.desiredCamera(false);
    const lambda = snap ? 40 : 4.2;
    this.camera.position.x = damp(this.camera.position.x, this.desired.x, lambda, dt, snap);
    this.camera.position.y = damp(this.camera.position.y, this.desired.y, lambda, dt, snap);
    this.camera.position.z = damp(this.camera.position.z, this.desired.z, lambda, dt, snap);
    this.look.x = damp(this.look.x, this.desiredLook.x, lambda, dt, snap);
    this.look.y = damp(this.look.y, this.desiredLook.y, lambda, dt, snap);
    this.look.z = damp(this.look.z, this.desiredLook.z, lambda, dt, snap);
    this.camera.lookAt(this.look);
    this.renderer.render(this.scene, this.camera);
    this.placeLabels(hoverDecade, hoverYear);
    this.frame = requestAnimationFrame(this.tick);
  };

  private lastTime = 0;
  private clockDelta(now: number) {
    const dt = this.lastTime === 0 ? 0.016 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    return dt;
  }

  private placeLabels(hoverDecade: number | null, hoverYear: number | null) {
    const { offsetX, usableHeight } = this.layout();
    for (let decade = 0; decade < this.decadeButtons.length; decade += 1) {
      const button = this.decadeButtons[decade];
      if (!button) continue;
      button.classList.toggle("isHot", hoverDecade === decade);
      if (this.view.mode !== "overview") {
        button.hidden = true;
        continue;
      }
      const point = pointOnRing(0, 0, decadeBaseY(decade));
      point.applyMatrix4(this.pivot.matrixWorld);
      point.project(this.camera);
      const y = (-point.y * 0.5 + 0.5) * this.height;
      const x = this.width - offsetX * 2 - 12;
      button.hidden = point.z > 1 || y < 8 || y > usableHeight - 8;
      button.style.transform = `translate(${x}px, ${y}px) translate(-100%, -50%)`;
    }

    for (let index = 0; index < this.yearButtons.length; index += 1) {
      const button = this.yearButtons[index];
      if (!button) continue;
      if (this.view.mode !== "decade") {
        button.hidden = true;
        continue;
      }
      const year = START_YEAR + this.view.decade * YEARS_PER_TURN + index;
      if (!this.eventsByYear.get(year)?.length) {
        button.hidden = true;
        continue;
      }
      const theta = yearIndexOf(year) * STEP_ANGLE + STEP_ANGLE / 2;
      const point = pointOnRing(theta, OUTER_RADIUS + 1.15, stepBaseY(year) + STEP_DEPTH * 0.5);
      point.applyMatrix4(this.pivot.matrixWorld);
      point.project(this.camera);
      const x = (point.x * 0.5 + 0.5) * this.width;
      const y = (-point.y * 0.5 + 0.5) * this.height;
      button.hidden = point.z > 1;
      button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }

    const tooltip = this.tooltip;
    if (!tooltip) return;
    const year = hoverYear;
    const event = year == null ? undefined : this.eventsByYear.get(year)?.[0];
    if (!event || this.view.mode !== "decade") {
      tooltip.hidden = true;
      return;
    }
    const theta = yearIndexOf(event.year) * STEP_ANGLE + STEP_ANGLE / 2;
    const point = pointOnRing(theta, (3 + OUTER_RADIUS) / 2, stepBaseY(event.year) + 0.7);
    point.applyMatrix4(this.pivot.matrixWorld);
    point.project(this.camera);
    tooltip.hidden = point.z > 1;
    tooltip.style.transform = `translate(${(point.x * 0.5 + 0.5) * this.width}px, ${(-point.y * 0.5 + 0.5) * this.height}px) translate(-50%, calc(-100% - 12px))`;
    const title = tooltip.querySelector("[data-spiral-tip-title]");
    const label = tooltip.querySelector("[data-spiral-tip-year]");
    if (label) label.textContent = String(event.year);
    if (title) title.textContent = event.title;
  }
}

export { decadeIndexOf };
