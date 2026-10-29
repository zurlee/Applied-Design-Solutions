// Grōth sprout: a three.js illustration for the "under construction" page.
// The stem grows out of a forest-green mound, two lime leaves unfold, growth rings
// ripple across the soil, and the plant sways gently. Brand colors only.
//
// Progressive enhancement: the SVG inside #sprout stays visible until WebGL is up,
// so the page still looks right with JavaScript off, no WebGL, or a blocked CDN.
// prefers-reduced-motion shows the fully grown sprout, still. Pauses off screen.
import * as THREE from "three";

const COLORS = {
  forest: 0x0d2e20,
  forest2: 0x16402d,
  lime: 0xc6f432,
  paper: 0xf4f0e6,
};

const host = document.getElementById("sprout");
if (host) start(host);

function start(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // no WebGL: keep the SVG fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.15, 4.6);
  camera.lookAt(0, 0.72, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8b0, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(2.5, 4, 3);
  scene.add(sun);

  // --- Soil mound -----------------------------------------------------------
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: COLORS.forest, roughness: 0.9 })
  );
  mound.scale.set(1, 0.28, 1);
  scene.add(mound);
  const moundTop = 0.95 * 0.28; // stem base height

  // --- Growth rings rippling over the mound --------------------------------
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.98, 1, 96),
      new THREE.MeshBasicMaterial({ color: COLORS.lime, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    ring.userData.offset = i / 3;
    scene.add(ring);
    rings.push(ring);
  }

  // --- Plant (everything that sways) ----------------------------------------
  const plant = new THREE.Group();
  plant.position.y = moundTop - 0.02;
  scene.add(plant);

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.018, 0.38, 0.01),
    new THREE.Vector3(-0.022, 0.76, 0.015),
    new THREE.Vector3(0.005, 1.1, 0),
  ]);
  const TUBE_SEGMENTS = 80;
  const RADIAL = 12;
  const stemGeo = new THREE.TubeGeometry(stemCurve, TUBE_SEGMENTS, 0.045, RADIAL, false);
  const stemMat = new THREE.MeshStandardMaterial({ color: COLORS.forest2, roughness: 0.55 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  plant.add(stem);

  // Rounded tip that rides the top of the growing stem
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), stemMat);
  plant.add(tip);

  // Leaves: a cupped leaf shape with a darker midrib, hinged at the stem top
  const leafGeo = makeLeafGeometry();
  const leafMat = new THREE.MeshStandardMaterial({
    color: COLORS.lime,
    emissive: COLORS.lime,
    emissiveIntensity: 0.12,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const ribMat = new THREE.MeshStandardMaterial({ color: COLORS.forest2, roughness: 0.6 });
  const top = stemCurve.getPoint(1);
  const leaves = [1, -1].map((side) => {
    const hinge = new THREE.Group();
    hinge.position.copy(top);
    hinge.rotation.y = side === 1 ? 0.25 : Math.PI + 0.25;
    const tilt = new THREE.Group(); // opens from upright to spread
    hinge.add(tilt);
    const face = new THREE.Group(); // turn the blade a little toward the viewer
    face.rotation.x = -0.55 * side;
    tilt.add(face);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    face.add(leaf);
    const rib = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0.006),
          new THREE.Vector3(0.3, 0, 0.03),
          new THREE.Vector3(0.58, 0, 0.075),
        ]),
        20, 0.008, 6, false
      ),
      ribMat
    );
    face.add(rib);
    plant.add(hinge);
    return { hinge, tilt, side };
  });

  // --- Sizing ----------------------------------------------------------------
  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // --- Animation -------------------------------------------------------------
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const tipPos = new THREE.Vector3();

  function pose(t) {
    // Stem grows 0–1.6 s
    const g = reduced ? 1 : easeOut(t / 1.6);
    const visible = Math.max(1, Math.round(TUBE_SEGMENTS * g));
    stemGeo.setDrawRange(0, visible * RADIAL * 6);
    stemCurve.getPoint(visible / TUBE_SEGMENTS, tipPos);
    tip.position.copy(tipPos);

    // Leaves unfold 1.2–2.6 s
    const l = reduced ? 1 : easeOut((t - 1.2) / 1.4);
    for (const { hinge, tilt, side } of leaves) {
      hinge.scale.setScalar(Math.max(l, 0.001));
      const flutter = reduced ? 0 : Math.sin(t * 1.7 + side) * 0.05 * l;
      tilt.rotation.z = THREE.MathUtils.lerp(1.35, 0.32, l) + flutter;
    }

    // Gentle sway once grown
    plant.rotation.z = reduced ? 0 : Math.sin(t * 0.9) * 0.035 * g;
    plant.rotation.x = reduced ? 0 : Math.sin(t * 0.7 + 1) * 0.02 * g;

    // Growth rings ripple outward every 4 s, after the stem breaks the soil
    for (const ring of rings) {
      if (reduced) {
        const r = 1.02 + ring.userData.offset * 0.25;
        ring.scale.setScalar(r);
        ring.material.opacity = 0.25;
        continue;
      }
      const cycle = ((t - 0.8) / 4 + ring.userData.offset) % 1;
      const on = t > 0.8 ? 1 : 0;
      ring.scale.setScalar(0.97 + cycle * 0.33); // from the mound edge outward, staying in frame
      ring.material.opacity = on * 0.55 * Math.sin(Math.PI * cycle);
    }
  }

  let running = false;
  let raf = 0;
  const t0 = performance.now();
  function frame(now) {
    pose((now - t0) / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  if (reduced) {
    pose(10);
    renderer.render(scene, camera);
    new ResizeObserver(() => renderer.render(scene, camera)).observe(host);
  } else {
    new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? play() : pause())).observe(host);
    document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
    play();
  }

  host.classList.add("is-3d"); // hides the SVG fallback
}

/** A single leaf lying along +x, slightly cupped upward. */
function makeLeafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.1, 0.24, 0.42, 0.3, 0.64, 0);
  s.bezierCurveTo(0.42, -0.2, 0.12, -0.16, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, 0.16 * x * x + 0.6 * y * y); // lift the tip and the edges: a cupped leaf
  }
  geo.computeVertexNormals();
  return geo;
}
