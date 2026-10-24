import * as THREE from "three";
import type { SpiralCategory } from "@/lib/spiral/types";

export type SpiralPalette = {
  background: THREE.Color;
  neutral: THREE.Color;
  hover: THREE.Color;
  categories: Record<SpiralCategory, THREE.Color>;
};

export function readPalette(root: HTMLElement): SpiralPalette {
  const probe = document.createElement("i");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  root.appendChild(probe);

  const read = (name: string) => {
    probe.style.color = `var(${name})`;
    return new THREE.Color(getComputedStyle(probe).color);
  };

  const palette: SpiralPalette = {
    background: read("--spiral-bg"),
    neutral: read("--spiral-neutral"),
    hover: read("--spiral-hover"),
    categories: {
      rights: read("--spiral-rights"),
      migration: read("--spiral-migration"),
      labor: read("--spiral-labor"),
      culture: read("--spiral-culture"),
    },
  };
  probe.remove();
  return palette;
}
