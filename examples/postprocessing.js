/* global itowns, document, renderer */
const positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

// iTowns namespace defined here
const viewerDiv = document.getElementById('viewerDiv');
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer });

// Simple postprocessing setup
//
const postprocessScene = new itowns.THREE.Scene();
const quad = new itowns.THREE.Mesh(new itowns.THREE.PlaneBufferGeometry(2, 2), null);
quad.frustumCulled = false;
quad.material = new itowns.THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        tSize: { value: new itowns.THREE.Vector2(256, 256) },
        center: { value: new itowns.THREE.Vector2(0.5, 0.5) },
        angle: { value: 1.57 },
        scale: { value: 1.0 },
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
});
postprocessScene.add(quad);
const cam = new itowns.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);

globeView.render = () => {
    const g = globeView.mainLoop.gfxEngine;
    const r = g.renderer;
    r.setRenderTarget(g.fullSizeRenderTarget);
    r.clear();
    r.setViewport(0, 0, g.getWindowSize().x, g.getWindowSize().y);
    r.render(
        globeView.scene,
        globeView.camera.camera3D, g.fullSizeRenderTarget);

    quad.material.uniforms.tDiffuse.value = g.fullSizeRenderTarget.texture;
    quad.material.uniforms.tSize.value.set(
        g.fullSizeRenderTarget.width, g.fullSizeRenderTarget.height);

    r.setRenderTarget();
    r.clear();
    r.setViewport(0, 0, g.getWindowSize().x, g.getWindowSize().y);
    r.render(
        postprocessScene,
        cam);
};

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(result => globeView.addLayer(result));
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT.json').then(result => globeView.addLayer(result));

exports.globeView = globeView;
exports.postprocessScene = postprocessScene;
