import { mkdirSync, writeFileSync } from "node:fs";

const plates = [
  {
    name: "forearm-1",
    base: "#e7cbb4",
    light: "#f4e0cf",
    shadow: "#d7b49a",
    mark: "#e0b09f",
    core: "#d09a8c",
    mx: 390,
    my: 470,
    rx: 22,
    ry: 16,
    seed: 2,
  },
  {
    name: "forearm-2",
    base: "#e4c6ae",
    light: "#f2dcc8",
    shadow: "#d2ae94",
    mark: "#c98474",
    core: "#a86458",
    mx: 404,
    my: 482,
    rx: 46,
    ry: 30,
    seed: 4,
    irregular: true,
  },
  {
    name: "forearm-3",
    base: "#dcc0a6",
    light: "#ead4c0",
    shadow: "#c9a88e",
    mark: "#c47868",
    core: "#96564c",
    mx: 400,
    my: 474,
    rx: 54,
    ry: 34,
    seed: 6,
    irregular: true,
  },
  {
    name: "back-1",
    base: "#e8ccb4",
    light: "#f6e3d2",
    shadow: "#d8b69c",
    mark: "#d09484",
    core: "#b87468",
    mx: 370,
    my: 520,
    rx: 20,
    ry: 20,
    seed: 8,
  },
  {
    name: "back-2",
    base: "#d9bba4",
    light: "#ead2be",
    shadow: "#c8a68e",
    mark: "#c47b68",
    core: "#8d5148",
    mx: 560,
    my: 390,
    rx: 26,
    ry: 24,
    seed: 9,
  },
  {
    name: "cheek-1",
    base: "#f0d2c0",
    light: "#f8e6d8",
    shadow: "#e4bfaa",
    mark: "#e7b8a8",
    core: "#dbab9c",
    mx: 340,
    my: 560,
    rx: 110,
    ry: 72,
    seed: 3,
    diffuse: true,
  },
  {
    name: "demo-1",
    base: "#e6c8b0",
    light: "#f3decc",
    shadow: "#d4b094",
    mark: "#d29686",
    core: "#b56e62",
    mx: 430,
    my: 500,
    rx: 28,
    ry: 20,
    seed: 11,
  },
  {
    name: "demo-2",
    base: "#e2c2aa",
    light: "#f0d6c4",
    shadow: "#d0aa90",
    mark: "#c67d6c",
    core: "#9a584e",
    mx: 450,
    my: 470,
    rx: 48,
    ry: 32,
    seed: 12,
    irregular: true,
  },
  {
    name: "demo-3",
    base: "#ead0bc",
    light: "#f7e4d4",
    shadow: "#d8b49c",
    mark: "#e0aea0",
    core: "#c48b7c",
    mx: 380,
    my: 540,
    rx: 70,
    ry: 44,
    seed: 13,
    diffuse: true,
  },
];

function plate(item) {
  const halo = item.diffuse ? 0.45 : 0.78;
  const extra = item.irregular
    ? `<ellipse cx="${item.mx + 16}" cy="${item.my + 12}" rx="${(item.rx * 0.55).toFixed(1)}" ry="${(item.ry * 0.72).toFixed(1)}" fill="${item.core}" opacity="0.55"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <title>Sample illustration</title>
  <defs>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
    <filter id="mark" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${item.diffuse ? 16 : 6}"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${item.seed}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.16"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="800" height="1000" fill="${item.base}"/>
  <g filter="url(#soft)">
    <ellipse cx="320" cy="380" rx="240" ry="200" fill="${item.light}"/>
    <ellipse cx="520" cy="680" rx="220" ry="180" fill="${item.shadow}"/>
  </g>
  <g filter="url(#mark)" opacity="${halo}">
    <ellipse cx="${item.mx}" cy="${item.my}" rx="${item.rx}" ry="${item.ry}" fill="${item.mark}"/>
    <ellipse cx="${item.mx + 4}" cy="${item.my + 2}" rx="${(item.rx * 0.48).toFixed(1)}" ry="${(item.ry * 0.46).toFixed(1)}" fill="${item.core}"/>
    ${extra}
  </g>
  <rect width="800" height="1000" filter="url(#grain)"/>
  <rect x="18" y="18" width="764" height="964" fill="none" stroke="#5c534a" stroke-opacity="0.28"/>
  <text x="36" y="948" fill="#4e4942" font-family="Georgia, serif" font-size="28">Sample illustration</text>
</svg>
`;
}

mkdirSync(new URL("../public/samples/", import.meta.url), { recursive: true });
for (const item of plates) {
  const file = new URL(`../public/samples/${item.name}.svg`, import.meta.url);
  writeFileSync(file, plate(item));
}
