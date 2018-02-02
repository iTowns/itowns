/* global itowns, THREE, document, renderer, setupLoadingScreen */
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

// iTowns namespace defined here
var viewerDiv = document.getElementById('viewerDiv');
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });

// Simple postprocessing setup
//
var postprocessScene = new THREE.Scene();
var quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);

setupLoadingScreen(viewerDiv, globeView);

quad.frustumCulled = false;
quad.material = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        tSize: { value: new THREE.Vector2(256, 256) },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        angle: { value: 1.57 },
        scale: { value: 1.0 },
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
});
postprocessScene.add(quad);

globeView.render = function render() {
    var g = globeView.mainLoop.gfxEngine;
    var r = g.renderer;
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

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb);
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT.json').then(addLayerCb);

exports.globeView = globeView;
exports.postprocessScene = postprocessScene;
