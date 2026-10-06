import * as THREE from 'three';
type Point = { x: number; z: number };

export const ART_WIDTH = 1672;
export const ART_HEIGHT = 941;
export const ROBOT_SCALE = 1;
const DESK_HEIGHT = 0.792;
type Pixel = [number, number];
// Landmarks measured in the supplied, unmodified image. All overlays use its
// coordinate frame, so resizing and zoom cannot move a worker off their desk.
const floorPixels: Pixel[] = [
  [344, 278],
  [1094, 347],
  [1150, 792],
  [104, 633],
];
const floorPoints = [
  new THREE.Vector3(-10, 0, -6),
  new THREE.Vector3(10, 0, -6),
  new THREE.Vector3(10, 0, 6),
  new THREE.Vector3(-10, 0, 6),
];
const ndc = ([x, y]: Pixel): Pixel => [
  (x / ART_WIDTH) * 2 - 1,
  1 - (y / ART_HEIGHT) * 2,
];
function homography(from: Pixel[], to: Pixel[]) {
  const rows: number[][] = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i];
    rows.push(
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    );
  });
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let j = i + 1; j < 8; j++)
      if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot = j;
    [rows[i], rows[pivot]] = [rows[pivot], rows[i]];
    const divisor = rows[i][i];
    if (Math.abs(divisor) < 1e-10)
      throw new Error('Invalid office calibration');
    rows[i] = rows[i].map((v) => v / divisor);
    for (let j = 0; j < 8; j++)
      if (j !== i) {
        const factor = rows[j][i];
        rows[j] = rows[j].map((v, k) => v - factor * rows[i][k]);
      }
  }
  return rows.map((row) => row[8]);
}
export function createArtCamera() {
  const camera = new THREE.PerspectiveCamera(
    42,
    ART_WIDTH / ART_HEIGHT,
    0.5,
    180,
  );
  camera.position.set(5.5, 18, 25);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const source = floorPoints.map((p) => {
    const v = p.clone().project(camera);
    return [v.x, v.y] as Pixel;
  });
  const h = homography(source, floorPixels.map(ndc));
  // Warp clip space, including depth, while retaining a projective camera.
  const warp = new THREE.Matrix4().set(
    h[0],
    h[1],
    0,
    h[2],
    h[3],
    h[4],
    0,
    h[5],
    h[6],
    h[7],
    1,
    0,
    h[6],
    h[7],
    0,
    1,
  );
  camera.projectionMatrix.premultiply(warp);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return camera;
}
export function imagePoint(camera: THREE.Camera, pixel: Pixel, elevation = 0) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(...ndc(pixel)), camera);
  const point = ray.ray.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -elevation),
    new THREE.Vector3(),
  );
  if (!point) throw new Error('Office landmark does not meet floor');
  return point;
}
const keyboards: Pixel[] = [
  [340, 366],
  [514, 383],
  [684, 397],
  [872, 420],
  [1033, 437],
  [237, 573],
  [423, 580],
  [600, 606],
  [790, 635],
  [995, 647],
];
const tops: Pixel[][] = [
  [
    [293, 332],
    [423, 348],
    [415, 391],
    [274, 374],
  ],
  [
    [468, 349],
    [605, 365],
    [590, 408],
    [451, 391],
  ],
  [
    [645, 366],
    [776, 382],
    [766, 426],
    [626, 408],
  ],
  [
    [827, 385],
    [949, 402],
    [938, 448],
    [807, 430],
  ],
  [
    [992, 403],
    [1116, 421],
    [1110, 466],
    [977, 449],
  ],
  [
    [176, 538],
    [329, 557],
    [309, 603],
    [156, 583],
  ],
  [
    [371, 543],
    [521, 564],
    [503, 612],
    [349, 590],
  ],
  [
    [554, 566],
    [691, 588],
    [675, 636],
    [534, 614],
  ],
  [
    [739, 598],
    [892, 619],
    [876, 666],
    [718, 644],
  ],
  [
    [944, 613],
    [1091, 635],
    [1076, 684],
    [923, 660],
  ],
];
export function createArtLayout(camera: THREE.Camera) {
  const desks = tops.map((points) =>
    points.map((p) => imagePoint(camera, p, DESK_HEIGHT)),
  );
  const stations = keyboards.map((p) => {
    const v = imagePoint(camera, p, DESK_HEIGHT);
    return { x: v.x, z: v.z + 0.56 };
  });
  const bounds = desks.map((points) => ({
    left: Math.min(...points.map((p) => p.x)) - 0.25,
    right: Math.max(...points.map((p) => p.x)) + 0.25,
    back: Math.min(...points.map((p) => p.z)) - 0.25,
    front: Math.max(...points.map((p) => p.z)) + 0.25,
  }));
  stations.forEach((p, i) => {
    p.z = Math.max(p.z, bounds[i].front + 0.08);
  });
  const guests = stations.map((p) => ({ x: p.x + 0.95, z: p.z }));
  const cache = new Map<string, Point[]>();
  function route(visitor: number, host: number) {
    const key = `${visitor}:${host}`;
    if (cache.has(key)) return cache.get(key)!;
    const obstacles = [
      ...bounds,
      ...stations.flatMap((p, i) =>
        i === visitor
          ? []
          : [
              {
                left: p.x - 0.42,
                right: p.x + 0.42,
                back: p.z - 0.38,
                front: p.z + 0.38,
              },
            ],
      ),
    ];
    const inside = (p: Point) =>
      obstacles.some(
        (b) => p.x > b.left && p.x < b.right && p.z > b.back && p.z < b.front,
      );
    const clear = (a: Point, b: Point) => {
      // Exact open-rectangle segment intersection; touching the navigation
      // boundary is safe because bounds already include the robot radius.
      return !obstacles.some((r) => {
        let lo = 0,
          hi = 1;
        for (const [origin, delta, min, max] of [
          [a.x, b.x - a.x, r.left + 1e-5, r.right - 1e-5],
          [a.z, b.z - a.z, r.back + 1e-5, r.front - 1e-5],
        ]) {
          if (Math.abs(delta) < 1e-8) {
            if (origin <= min || origin >= max) return false;
          } else {
            const t1 = (min - origin) / delta,
              t2 = (max - origin) / delta;
            lo = Math.max(lo, Math.min(t1, t2));
            hi = Math.min(hi, Math.max(t1, t2));
          }
        }
        return lo < hi;
      });
    };
    const start = stations[visitor],
      end = guests[host];
    const nodes = [
      start,
      end,
      ...obstacles
        .flatMap((b) => [
          { x: b.left, z: b.back },
          { x: b.right, z: b.back },
          { x: b.right, z: b.front },
          { x: b.left, z: b.front },
        ])
        .filter(
          (p) =>
            !inside(p) && p.z <= 6 && p.z >= -5.8 && p.x >= -9.8 && p.x <= 10,
        ),
    ];
    const dist = nodes.map(() => Infinity),
      prev = nodes.map(() => -1),
      used = new Set<number>();
    dist[0] = 0;
    for (let step = 0; step < nodes.length; step++) {
      let u = -1;
      for (let i = 0; i < nodes.length; i++)
        if (!used.has(i) && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || !Number.isFinite(dist[u])) break;
      if (u === 1) break;
      used.add(u);
      for (let v = 0; v < nodes.length; v++)
        if (!used.has(v) && clear(nodes[u], nodes[v])) {
          const d =
            dist[u] +
            Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z);
          if (d < dist[v]) {
            dist[v] = d;
            prev[v] = u;
          }
        }
    }
    if (!Number.isFinite(dist[1]))
      throw new Error(`No clear office route ${key}`);
    const path: Point[] = [];
    for (let i = 1; i >= 0; i = prev[i]) path.unshift(nodes[i]);
    cache.set(key, path);
    return path;
  }
  return { desks, stations, guests, bounds, route };
}
export function addArtOcclusion(
  scene: THREE.Scene,
  layout: ReturnType<typeof createArtLayout>,
) {
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    side: THREE.DoubleSide,
  });
  layout.desks.forEach((points) => {
    const vertices = points.flatMap((p) => [p.x, p.y, p.z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1;
    scene.add(mesh);
    // Thin front apron, leaving the open space beneath the desks visible.
    const a = points[2],
      b = points[3];
    const apron = new THREE.BufferGeometry();
    apron.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          a.x,
          a.y,
          a.z,
          b.x,
          b.y,
          b.z,
          b.x,
          b.y - 0.18,
          b.z,
          a.x,
          a.y - 0.18,
          a.z,
        ],
        3,
      ),
    );
    apron.setIndex([0, 1, 2, 0, 2, 3]);
    const edge = new THREE.Mesh(apron, material);
    edge.renderOrder = -1;
    scene.add(edge);
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.ShadowMaterial({
      color: '#433325',
      opacity: 0.27,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  shadow.receiveShadow = true;
  scene.add(shadow);
}
