import * as THREE from 'three';

const position = new THREE.Vector3(1.2796710118175263, -1.1093944188007165, -0.7728289836244095);
const quaternion = new THREE.Quaternion(
  -0.6114646814180495,
  0.2690235747992794,
  0.6624055237025962,
  0.3390518865141867,
);
const fov = 80.5028374682796;
const aspect = 0.7525083612040134;
const near = 0.05;
const far = 100;

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.copy(position);
camera.quaternion.copy(quaternion);
camera.updateProjectionMatrix();
camera.updateMatrixWorld(true);

const testPoints: [string, THREE.Vector3][] = [
  ['origine (0,0,0)', new THREE.Vector3(0, 0, 0)],
  ['punto0 sx (0,0,-0.45)', new THREE.Vector3(0, 0, -0.45)],
  ['punto3 dx (0.84,0.51,0.45)', new THREE.Vector3(0.84, 0.51, 0.45)],
];

for (const [label, p] of testPoints) {
  const ndc = p.clone().project(camera);
  const local = p.clone().applyMatrix4(camera.matrixWorldInverse);
  console.log(
    `${label}: NDC=(${ndc.x.toFixed(3)}, ${ndc.y.toFixed(3)}, ${ndc.z.toFixed(3)}) ` +
      `camera-local Z=${local.z.toFixed(3)} (Three.js: negativo=davanti alla camera) ` +
      `dentro-frustum-xy=${Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1}`,
  );
}

console.log('camera.matrixWorld:', camera.matrixWorld.elements);
