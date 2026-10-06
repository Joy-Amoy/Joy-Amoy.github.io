import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { workers } from './workers';

export type RobotModel = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  arms: { upper: THREE.Group; fore: THREE.Group }[];
  legs: { thigh: THREE.Group; knee: THREE.Group }[];
  ring: THREE.Mesh;
  indicator: THREE.MeshStandardMaterial;
  tool: THREE.Group;
  scanner: THREE.Group | null;
  stowedTool: THREE.Group | null;
  eyes: THREE.Mesh[];
};
export function createOfficeWorld(scene: THREE.Scene) {
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string, rough = 0.62, metal = 0.03) {
    const key = color + rough + metal;
    if (!mats.has(key))
      mats.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: rough,
          metalness: metal,
        }),
      );
    return mats.get(key)!;
  }
  const dark = material('#26383d'),
    steel = material('#53666a', 0.4, 0.55);
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    r = 0,
  ) {
    const mesh = new THREE.Mesh(
      r
        ? new RoundedBoxGeometry(w, h, d, 2, r)
        : new THREE.BoxGeometry(w, h, d),
      m,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    height: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    segments = 16,
  ) {
    const o = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, height, segments),
      m,
    );
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function sphere(
    parent: THREE.Object3D,
    r: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.castShadow = true;
    parent.add(o);
    return o;
  }
  const office = new THREE.Group();
  scene.add(office);
  const robots: RobotModel[] = workers.map((w, i) => {
    const root = new THREE.Group();
    root.rotation.y = Math.PI;
    office.add(root);
    const isCEO = i === 0;
    const customOutfit = [1, 2, 3, 4, 7, 9].includes(i);
    const isSupply = i === 5,
      isSupport = i === 6,
      isData = i === 8;
    const workwear = material('#39725e', 0.92);
    const workTrim = material('#b7d7bc', 0.76);
    const hood = material('#405b79', 0.95);
    const hoodTrim = material('#759ab7', 0.86);
    const boot = material('#384744', 0.85);
    const suit = material('#243b55', 0.84, 0.02);
    const lapel = material('#3e5871', 0.72, 0.02);
    const shirt = material('#fff8e9', 0.8);
    const tie = material('#b5654e', 0.7);
    const trousers = material('#293646', 0.86);
    const shoes = material('#202830', 0.3, 0.12);
    const color = material(w.c, 0.35, 0.22),
      ivory = material('#f0eee1', 0.35, 0.13),
      joint = material('#52656a', 0.34, 0.4);
    const fabric = material(w.c, 0.9, 0.01);
    const cream = material('#f4e8d5', 0.95);
    function hoop(
      parent: THREE.Object3D,
      radius: number,
      tube: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 24),
        m,
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function cameraBody(parent: THREE.Object3D) {
      box(parent, 0.42, 0.27, 0.16, dark, 0, 0, 0, 0.04);
      box(parent, 0.15, 0.065, 0.12, steel, -0.075, 0.155, 0, 0.018);
      const lens = cylinder(parent, 0.11, 0.12, 0.15, steel, 0.05, 0, 0.12);
      lens.rotation.x = Math.PI / 2;
      sphere(
        parent,
        0.087,
        material('#638eac', 0.15, 0.6),
        0.05,
        0,
        0.208,
        1,
        1,
        0.24,
      );
      box(parent, 0.065, 0.04, 0.018, cream, -0.13, 0.055, 0.09, 0.008);
    }
    const torso = new THREE.Group();
    root.add(torso);
    if (isCEO) {
      // The suit uses the existing skeleton, so typing, gesturing and walking
      // all carry the jacket, cuffs and trousers with the original joints.
      box(torso, 0.68, 0.63, 0.44, suit, 0, 0.875, 0, 0.065);
      function tailoring(
        points: [number, number][],
        m: THREE.Material,
        z: number,
      ) {
        const shape = new THREE.Shape();
        points.forEach(([x, y], n) =>
          n ? shape.lineTo(x, y) : shape.moveTo(x, y),
        );
        shape.closePath();
        const piece = new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.018,
            bevelEnabled: false,
          }),
          m,
        );
        piece.position.z = z;
        piece.castShadow = true;
        torso.add(piece);
      }
      tailoring(
        [
          [-0.115, 1.19],
          [0.115, 1.19],
          [0.055, 0.8],
          [-0.055, 0.8],
        ],
        shirt,
        0.224,
      );
      for (const side of [-1, 1]) {
        tailoring(
          [
            [side * 0.11, 1.18],
            [side * 0.3, 1.08],
            [side * 0.17, 0.98],
            [side * 0.22, 0.92],
            [side * 0.035, 0.78],
          ],
          lapel,
          0.247,
        );
        tailoring(
          [
            [0, 1.17],
            [side * 0.12, 1.19],
            [side * 0.09, 1.06],
          ],
          shirt,
          0.268,
        );
      }
      tailoring(
        [
          [0, 1.135],
          [0.045, 1.085],
          [0, 1.035],
          [-0.045, 1.085],
        ],
        tie,
        0.284,
      );
      tailoring(
        [
          [-0.025, 1.045],
          [0.025, 1.045],
          [0.046, 0.86],
          [0, 0.8],
          [-0.046, 0.86],
        ],
        tie,
        0.278,
      );
      box(torso, 0.15, 0.025, 0.025, lapel, 0.205, 0.965, 0.239, 0.006);
      tailoring(
        [
          [0.145, 0.979],
          [0.175, 1.026],
          [0.199, 0.99],
          [0.235, 1.014],
          [0.263, 0.979],
        ],
        shirt,
        0.257,
      );
      for (const y of [0.76, 0.66])
        sphere(torso, 0.019, steel, 0.04, y, 0.234, 1, 1, 0.45);
      // Back seam and collar keep the tailored silhouette visible at the desk.
      box(torso, 0.014, 0.43, 0.01, lapel, 0, 0.83, -0.224, 0.004);
      box(torso, 0.24, 0.06, 0.025, shirt, 0, 1.178, -0.18, 0.013);
      cylinder(torso, 0.118, 0.12, 0.06, shirt, 0, 1.2, 0, 12);
    } else if (isSupply) {
      // Wraparound vest and cargo pockets remain recognizable from behind.
      box(torso, 0.7, 0.59, 0.47, workwear, 0, 0.89, 0, 0.075).name =
        'finn-work-vest';
      for (const side of [-1, 1]) {
        box(
          torso,
          0.085,
          0.45,
          0.025,
          workTrim,
          side * 0.21,
          0.95,
          0.246,
          0.008,
        );
        box(
          torso,
          0.085,
          0.45,
          0.025,
          workTrim,
          side * 0.21,
          0.95,
          -0.246,
          0.008,
        );
        box(torso, 0.19, 0.17, 0.07, color, side * 0.19, 0.76, 0.26, 0.025);
        box(torso, 0.1, 0.2, 0.23, workwear, side * 0.38, 0.69, 0, 0.028);
      }
      box(torso, 0.72, 0.075, 0.49, workTrim, 0, 0.85, 0, 0.018);
      box(torso, 0.026, 0.55, 0.025, steel, 0, 0.9, 0.253, 0.006);
      box(torso, 0.71, 0.085, 0.48, boot, 0, 0.62, 0, 0.016);
      box(torso, 0.13, 0.09, 0.045, steel, 0, 0.62, 0.255, 0.01);
    } else if (isData) {
      box(torso, 0.7, 0.62, 0.48, hood, 0, 0.88, 0, 0.13).name = 'stack-hoodie';
      box(torso, 0.43, 0.17, 0.045, hoodTrim, 0, 0.74, 0.244, 0.04);
      box(torso, 0.64, 0.075, 0.46, hoodTrim, 0, 0.61, 0, 0.03);
      for (const side of [-1, 1]) {
        box(torso, 0.018, 0.21, 0.026, shirt, side * 0.11, 1.02, 0.255, 0.006);
        sphere(torso, 0.026, color, side * 0.11, 0.91, 0.26);
      }
    } else if (customOutfit) {
      const names: Record<number, string> = {
        1: 'nova-quality-coat',
        2: 'pixel-varsity-jacket',
        3: 'coco-channel-coat',
        4: 'echo-camera-jacket',
        7: 'bolt-ops-cardigan',
        9: 'sage-finance-waistcoat',
      };
      box(
        torso,
        0.66,
        i === 1 || i === 3 ? 0.69 : 0.6,
        0.45,
        fabric,
        0,
        0.86,
        0,
        0.065,
      ).name = names[i];
      box(torso, 0.25, 0.48, 0.025, cream, 0, 0.91, 0.237, 0.018);
      for (const side of [-1, 1]) {
        const collar = box(
          torso,
          0.14,
          0.16,
          0.045,
          i === 9 ? dark : cream,
          side * 0.12,
          1.08,
          0.253,
          0.016,
        );
        collar.rotation.z = side * -0.45;
      }
      if (i === 1) {
        for (const side of [-1, 1])
          box(torso, 0.19, 0.17, 0.045, cream, side * 0.2, 0.72, 0.249, 0.025);
        box(torso, 0.48, 0.12, 0.025, cream, 0, 0.96, -0.235, 0.02);
      } else if (i === 2) {
        box(torso, 0.66, 0.07, 0.46, cream, 0, 0.61, 0, 0.02);
        box(torso, 0.46, 0.22, 0.03, cream, 0, 0.91, -0.24, 0.04);
        for (let bar = 0; bar < 3; bar++)
          box(
            torso,
            0.07,
            0.07 + bar * 0.04,
            0.012,
            fabric,
            -0.11 + bar * 0.11,
            0.89 + bar * 0.02,
            -0.263,
            0.008,
          );
        box(torso, 0.15, 0.15, 0.035, dark, -0.18, 0.97, 0.26, 0.025);
      } else if (i === 3) {
        box(torso, 0.4, 0.13, 0.44, cream, 0, 1.14, 0, 0.04);
        box(torso, 0.14, 0.28, 0.045, cream, -0.18, 0.98, -0.26, 0.018);
        box(torso, 0.15, 0.22, 0.035, cream, 0.17, 0.96, 0.27, 0.018);
      } else if (i === 4) {
        for (const z of [-0.246, 0.265]) {
          const strap = box(torso, 0.085, 0.64, 0.035, dark, 0, 0.87, z, 0.008);
          strap.rotation.z = -0.65;
        }
      } else if (i === 7) {
        const strap = hoop(torso, 0.15, 0.018, dark, 0, 1.035, 0.27);
        strap.scale.y = 1.2;
        box(torso, 0.18, 0.2, 0.035, cream, 0, 0.84, 0.29, 0.018);
        box(torso, 0.12, 0.06, 0.015, fabric, 0, 0.88, 0.315, 0.008);
        box(torso, 0.48, 0.1, 0.025, cream, 0, 1.055, -0.235, 0.02);
      } else if (i === 9) {
        for (const y of [0.95, 0.83, 0.71])
          sphere(torso, 0.024, dark, 0.02, y, 0.26, 1, 1, 0.5);
        box(torso, 0.42, 0.05, 0.025, dark, 0, 0.8, -0.236, 0.01);
        box(torso, 0.02, 0.43, 0.014, cream, 0, 0.87, -0.239, 0.004);
      }
    } else {
      box(torso, 0.58, 0.55, 0.4, color, 0, 0.88, 0, 0.12);
      box(torso, 0.4, 0.25, 0.035, ivory, 0, 0.94, 0.22, 0.035);
      box(torso, 0.18, 0.035, 0.038, dark, 0, 0.92, 0.24, 0.01);
    }
    const indicator = new THREE.MeshStandardMaterial({
      color: isCEO ? '#d7b56f' : '#b7ecc9',
      emissive: isCEO ? '#8c6830' : '#7ac99a',
      emissiveIntensity: 0.4,
    });
    sphere(
      torso,
      isCEO ? 0.023 : 0.041,
      indicator,
      isCEO ? -0.2 : 0.12,
      isCEO ? 1.07 : 1.01,
      isCEO ? 0.273 : 0.25,
    );
    box(
      torso,
      0.4,
      0.17,
      0.32,
      isCEO ? trousers : isSupply ? workwear : isData ? hood : joint,
      0,
      0.57,
      0,
      0.05,
    );
    const head = new THREE.Group();
    head.position.set(0, 1.46, 0);
    torso.add(head);
    cylinder(torso, 0.095, 0.095, 0.12, joint, 0, 1.2, 0, 12);
    box(head, 0.76, 0.53, 0.48, ivory, 0, 0, 0, 0.14);
    box(head, 0.64, 0.33, 0.058, dark, 0, 0, 0.247, 0.08);
    const eye = material('#b3edcd', 0.3);
    eye.emissive.set('#579d8f');
    eye.emissiveIntensity = 0.6;
    const eyes = [-0.155, 0.155].map((x) =>
      box(head, 0.12, 0.13, 0.022, eye, x, 0.014, 0.28, 0.04),
    );
    box(head, 0.15, 0.025, 0.022, eye, 0, -0.098, 0.28, 0.008);
    sphere(head, 0.078, color, -0.435, 0.015, 0);
    sphere(head, 0.078, color, 0.435, 0.015, 0);
    if (!isSupport && !isData) {
      cylinder(head, 0.022, 0.022, 0.16, steel, 0, 0.335, 0, 8);
      sphere(head, 0.064, color, 0, 0.455, 0);
    }
    if (isData) {
      sphere(head, 0.5, hood, 0, 0.035, -0.14, 1.02, 0.87, 0.76).name =
        'stack-raised-hood';
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.435, 0.07, 8, 24),
        hoodTrim,
      );
      rim.position.set(0, 0.015, 0.18);
      rim.scale.y = 0.83;
      rim.castShadow = true;
      head.add(rim);
      box(head, 0.57, 0.035, 0.028, hoodTrim, 0, 0.125, 0.292, 0.012);
    }
    if (i === 1) {
      // Safety goggles have a broad rear strap as well as visible front rims.
      box(head, 0.79, 0.105, 0.028, dark, 0, 0.035, -0.249, 0.016);
      for (const side of [-1, 1]) {
        const rim = hoop(head, 0.165, 0.033, fabric, side * 0.18, 0.02, 0.32);
        rim.scale.y = 0.8;
        box(head, 0.04, 0.075, 0.51, dark, side * 0.39, 0.035, 0.015, 0.01);
      }
      box(head, 0.84, 0.1, 0.58, color, 0, 0.255, 0.01, 0.045);
      box(head, 0.48, 0.15, 0.38, color, 0, 0.33, -0.02, 0.07);
    }
    if (isSupport) {
      const headset = new THREE.Mesh(
        new THREE.TorusGeometry(0.49, 0.064, 8, 24, Math.PI),
        dark,
      );
      headset.name = 'scout-headset';
      headset.position.set(0, 0.055, 0);
      headset.castShadow = true;
      head.add(headset);
      for (const side of [-1, 1]) {
        box(head, 0.23, 0.37, 0.33, dark, side * 0.47, 0.015, 0, 0.09);
        box(head, 0.055, 0.27, 0.25, color, side * 0.596, 0.015, 0, 0.06);
        box(head, 0.02, 0.075, 0.13, workTrim, side * 0.628, 0.02, 0, 0.016);
      }
      const boom = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.55, -0.09, 0.08),
        new THREE.Vector3(0.51, -0.19, 0.34),
        new THREE.Vector3(0.23, -0.2, 0.42),
      ]);
      const microphone = new THREE.Mesh(
        new THREE.TubeGeometry(boom, 12, 0.026, 6, false),
        dark,
      );
      microphone.name = 'scout-microphone';
      head.add(microphone);
      box(head, 0.17, 0.085, 0.085, dark, 0.21, -0.2, 0.42, 0.035);
      box(torso, 0.66, 0.16, 0.44, color, 0, 1.08, 0, 0.065);
      box(torso, 0.35, 0.12, 0.028, shirt, 0, 0.96, -0.22, 0.025);
    }
    if (i === 2) {
      box(head, 0.82, 0.095, 0.53, fabric, 0, 0.22, 0, 0.035).name =
        'pixel-visor';
      box(head, 0.8, 0.055, 0.3, fabric, 0, 0.24, 0.31, 0.025);
    }
    if (i === 3)
      box(head, 0.09, 0.23, 0.13, cream, -0.46, -0.035, 0.03, 0.04).name =
        'coco-earpiece';
    if (i === 4) {
      box(head, 0.71, 0.17, 0.5, fabric, 0, 0.29, -0.03, 0.07).name =
        'echo-backward-cap';
      box(head, 0.45, 0.05, 0.32, fabric, 0, 0.24, -0.37, 0.025);
    }
    if (i === 9) {
      for (const side of [-1, 1]) {
        hoop(head, 0.155, 0.026, dark, side * 0.185, 0.025, 0.317).name =
          'sage-round-glasses';
        box(head, 0.025, 0.03, 0.46, dark, side * 0.365, 0.065, 0.085, 0.006);
      }
      box(head, 0.085, 0.026, 0.025, dark, 0, 0.045, 0.318, 0.007);
    }
    const arms = [-1, 1].map((side) => {
      const upper = new THREE.Group();
      upper.position.set(side * 0.365, 1.18, 0);
      torso.add(upper);
      sphere(upper, 0.092, joint);
      box(
        upper,
        isCEO || isData || isSupply || customOutfit ? 0.21 : 0.15,
        0.24,
        isCEO || isData || isSupply || customOutfit ? 0.22 : 0.17,
        isCEO
          ? suit
          : isData
            ? hood
            : isSupply
              ? workwear
              : customOutfit
                ? i === 2 || i === 9
                  ? cream
                  : fabric
                : ivory,
        0,
        -0.12,
        0,
        0.055,
      );
      const fore = new THREE.Group();
      fore.position.y = -0.25;
      upper.add(fore);
      sphere(fore, 0.082, joint);
      box(
        fore,
        isCEO || isData || isSupply || customOutfit ? 0.2 : 0.14,
        0.24,
        isCEO || isData || isSupply || customOutfit ? 0.2 : 0.16,
        isCEO
          ? suit
          : isData
            ? hood
            : isSupply
              ? workwear
              : customOutfit
                ? i === 9
                  ? cream
                  : fabric
                : color,
        0,
        -0.12,
        0,
        0.045,
      );
      if (isCEO) box(fore, 0.195, 0.042, 0.195, shirt, 0, -0.238, 0, 0.016);
      sphere(fore, 0.078, ivory, 0, -0.27, 0.01);
      return { upper, fore };
    });
    let scanner: THREE.Group | null = null;
    if (isSupply) {
      scanner = new THREE.Group();
      scanner.name = 'finn-handheld-scanner';
      scanner.position.set(0, -0.28, 0.065);
      scanner.rotation.x = 0.9;
      arms[1].fore.add(scanner);
      box(scanner, 0.09, 0.17, 0.1, boot, 0, -0.025, 0, 0.018);
      box(scanner, 0.19, 0.13, 0.22, dark, 0, 0.07, 0.065, 0.035);
      const scanLight = material('#a5ebd3', 0.35);
      scanLight.emissive.set('#4cbb95');
      scanLight.emissiveIntensity = 0.65;
      box(scanner, 0.14, 0.05, 0.015, scanLight, 0, 0.075, 0.184, 0.008);
      scanner.visible = false;
    }
    let stowedTool: THREE.Group | null = null;
    if (i === 4) {
      stowedTool = new THREE.Group();
      stowedTool.name = 'echo-carried-camera';
      stowedTool.position.set(0.29, 0.64, 0.27);
      stowedTool.rotation.z = -0.2;
      torso.add(stowedTool);
      cameraBody(stowedTool);
    }
    const tool = new THREE.Group();
    tool.position.set(0, 1.02, 0.47);
    tool.rotation.x = -0.85;
    torso.add(tool);
    if (isSupply) tool.position.x = -0.12;
    if (i === 4) {
      tool.name = 'echo-shooting-camera';
      cameraBody(tool);
    } else if (i === 3) {
      tool.name = 'coco-dual-channel-tablet';
      for (const side of [-1, 1]) {
        const screen = new THREE.Group();
        screen.position.x = side * 0.18;
        screen.rotation.y = side * -0.2;
        tool.add(screen);
        box(screen, 0.34, 0.4, 0.05, dark, 0, 0, 0, 0.022);
        box(
          screen,
          0.29,
          0.34,
          0.014,
          material(side < 0 ? '#f4d4dc' : '#b8dbe6'),
          0,
          0,
          0.03,
          0.015,
        );
        box(screen, 0.2, 0.1, 0.009, fabric, 0, 0.07, 0.042, 0.01);
        for (let row = 0; row < 2; row++)
          box(
            screen,
            0.21 - row * 0.05,
            0.025,
            0.009,
            steel,
            0,
            -0.04 - row * 0.06,
            0.042,
            0.005,
          );
      }
    } else if (i === 9) {
      tool.name = 'sage-calculator';
      box(tool, 0.4, 0.47, 0.075, dark, 0, 0, 0, 0.025);
      box(tool, 0.31, 0.1, 0.015, material('#c1d9c7'), 0, 0.145, 0.045, 0.008);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
          box(
            tool,
            0.065,
            0.055,
            0.024,
            col === 2 ? fabric : cream,
            -0.105 + col * 0.105,
            0.035 - row * 0.085,
            0.055,
            0.008,
          );
    } else if (i === 7) {
      tool.name = 'bolt-team-schedule';
      box(tool, 0.57, 0.43, 0.045, fabric, 0, 0, 0, 0.025);
      box(tool, 0.5, 0.35, 0.015, cream, 0, 0, 0.03, 0.01);
      box(tool, 0.2, 0.055, 0.035, steel, 0, 0.2, 0.02, 0.01);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
          box(
            tool,
            0.11,
            0.055,
            0.009,
            material(['#679dc4', '#d58091', '#70a58b'][col]),
            -0.155 + col * 0.155,
            0.1 - row * 0.1,
            0.043,
            0.007,
          );
    } else if (w.prop === 'parcel' || w.prop === 'sample') {
      box(
        tool,
        0.44,
        0.31,
        0.28,
        material(w.prop === 'parcel' ? '#bf925b' : '#e9e3ce'),
        0,
        0,
        0,
        0.025,
      );
      box(tool, 0.08, 0.315, 0.285, material('#e5c994'));
      box(tool, 0.18, 0.11, 0.012, whiteLabel(), 0.09, 0, 0.147, 0.006);
      if (i === 1) {
        hoop(tool, 0.16, 0.028, steel, 0.27, 0.12, 0.22).name =
          'nova-inspection-lens';
        const grip = box(
          tool,
          0.055,
          0.2,
          0.06,
          dark,
          0.33,
          -0.085,
          0.22,
          0.016,
        );
        grip.rotation.z = 0.3;
      }
      if (isSupply) {
        for (let stripe = 0; stripe < 6; stripe++)
          box(
            tool,
            stripe % 2 ? 0.009 : 0.015,
            0.07,
            0.006,
            dark,
            0.025 + stripe * 0.023,
            0,
            0.157,
          );
      }
    } else if (w.prop !== 'headset') {
      const paper = w.prop === 'clipboard';
      box(
        tool,
        0.53,
        0.39,
        0.045,
        material(paper ? '#a97e4e' : '#30494f'),
        0,
        0,
        0,
        0.025,
      );
      box(
        tool,
        0.46,
        0.31,
        0.013,
        material(paper ? '#f3ead4' : '#beded2'),
        0,
        0,
        0.028,
        0.008,
      );
      if (i === 2) {
        tool.name = 'pixel-product-catalog';
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 3; col++)
            box(
              tool,
              0.095,
              0.1,
              0.009,
              fabric,
              -0.13 + col * 0.13,
              0.07 - row * 0.145,
              0.042,
              0.012,
            );
      }
      for (let bar = 0; bar < (i === 2 ? 0 : 4); bar++) {
        if (paper)
          box(
            tool,
            0.31 - bar * 0.025,
            0.016,
            0.008,
            material('#859181'),
            0,
            0.085 - bar * 0.052,
            0.039,
          );
        else
          box(
            tool,
            0.065,
            0.06 + bar * 0.043,
            0.008,
            color,
            -0.145 + bar * 0.095,
            -0.07 + bar * 0.021,
            0.039,
          );
      }
      if (paper) box(tool, 0.16, 0.065, 0.035, steel, 0, 0.17, 0.03, 0.008);
    }
    function whiteLabel() {
      return material('#eee9d6');
    }
    tool.visible = false;
    const legs = [-1, 1].map((side) => {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.16, 0.515, 0);
      root.add(thigh);
      box(
        thigh,
        isCEO ? 0.205 : 0.17,
        0.22,
        0.2,
        isCEO ? trousers : isSupply ? workwear : isData ? hood : joint,
        0,
        -0.11,
        0,
        0.045,
      );
      const knee = new THREE.Group();
      knee.position.y = -0.22;
      thigh.add(knee);
      sphere(knee, 0.083, joint);
      box(
        knee,
        isCEO ? 0.195 : 0.165,
        0.21,
        isCEO ? 0.19 : 0.17,
        isCEO ? trousers : isSupply ? workwear : isData ? dark : ivory,
        0,
        -0.1,
        0,
        0.04,
      );
      box(
        knee,
        isCEO ? 0.26 : 0.235,
        0.12,
        isCEO ? 0.36 : 0.33,
        isCEO ? shoes : isSupply ? boot : isData ? hoodTrim : color,
        0,
        -0.235,
        0.055,
        0.045,
      );
      if (isSupply) {
        box(thigh, 0.085, 0.15, 0.18, color, side * 0.12, -0.11, 0, 0.02);
        box(knee, 0.2, 0.055, 0.19, workTrim, 0, -0.135, 0, 0.01);
      }
      return { thigh, knee };
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.47, 0.51, 36),
      new THREE.MeshBasicMaterial({
        color: '#a3bfd9',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.009;
    root.add(ring);
    root.traverse((o) => {
      o.userData.worker = i;
    });
    return {
      root,
      torso,
      head,
      arms,
      legs,
      ring,
      indicator,
      tool,
      scanner,
      stowedTool,
      eyes,
    };
  });
  return { office, robots };
}
export function disposeWorld(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => {
        materials.add(m);
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
