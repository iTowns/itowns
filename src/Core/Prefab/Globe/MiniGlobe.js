import * as THREE from 'three';

function TargetMesh() {
    const ring = new THREE.RingGeometry(40, 37, 32);
    const point = new THREE.CircleGeometry(2, 32);
    const shadow = new THREE.CircleGeometry(5, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide, opacity: 0.8, transparent: true });
    const shadowMesh = new THREE.Mesh(shadow, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, opacity: 0.5, transparent: true }));
    const targetMesh = new THREE.Mesh(ring, material);
    targetMesh.add(new THREE.Mesh(point, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, opacity: 0.85, transparent: true })));
    targetMesh.position.set(0, 0, -500);
    targetMesh.updateMatrix();
    targetMesh.updateMatrixWorld(true);
    shadowMesh.translateZ(-10);
    targetMesh.updateMatrix();
    targetMesh.updateMatrixWorld(true);
    targetMesh.add(shadowMesh);

    return targetMesh;
}

function displayAllTilesWithLevel(globe, level) {
    globe.level0Nodes.forEach(node =>
        node.traverse((tile) => {
            if (tile.level && tile.level < level + 2) {
                tile.material.previousVisibilty = tile.material.visible;
                tile.previousVisibilty = tile.visible;
                tile.material.visible = tile.level === level;
                tile.visible = tile.level <= level;
                tile.enableRTC(false);
            }
        }));
}

function resetToPreviousVibility(globe, level) {
    globe.level0Nodes.forEach(node =>
        node.traverse((tile) => {
            if (tile.level && tile.level < level + 2) {
                tile.material.visible = tile.material.previousVisibilty === undefined ? tile.material.visible : tile.material.previousVisibilty;
                tile.visible = tile.previousVisibilty === undefined ? tile.visible : tile.previousVisibilty;
                tile.material.previousVisibilty = undefined;
                tile.previousVisibilty = undefined;
                tile.enableRTC(true);
            }
        }));
}

export default function MiniGlobe(view, globe) {
    const miniGlobe = {};

    const miniGlobeCamera = view.camera.camera3D.clone();
    miniGlobeCamera.aspect = 1.0;
    miniGlobeCamera.updateProjectionMatrix();
    miniGlobeCamera.maxDistance = miniGlobeCamera.position.length();

    const targetMesh = TargetMesh();
    miniGlobeCamera.add(targetMesh);
    view.scene.add(miniGlobeCamera);

    miniGlobe.render = (renderer) => {
        if (view.miniGlobeOptions.visible) {
            displayAllTilesWithLevel(globe, 2);
            const distanceCamera = view.camera.camera3D.position.length();
            const distance = Math.min(miniGlobeCamera.maxDistance, distanceCamera * 1.5);
            miniGlobeCamera.position.copy(view.controls.moveTarget()).setLength(distance);
            miniGlobeCamera.lookAt(view.controls.moveTarget());
            miniGlobeCamera.up.set(0, 0, 1);
            miniGlobeCamera.updateMatrix();
            miniGlobeCamera.updateMatrixWorld(true);
            targetMesh.visible = false;
            renderer.clearDepth();
            renderer.setViewport(view.miniGlobeOptions.position.x, view.miniGlobeOptions.position.y, view.miniGlobeOptions.size, view.miniGlobeOptions.size);
            renderer.render(view.scene, miniGlobeCamera);
            miniGlobeCamera.position.set(0, 0, 0);
            miniGlobeCamera.updateMatrix();
            miniGlobeCamera.updateMatrixWorld(true);
            renderer.clearDepth();
            targetMesh.visible = true;
            renderer.render(view.scene, miniGlobeCamera);
            resetToPreviousVibility(globe, 2);
        }
    };

    return miniGlobe;
}
