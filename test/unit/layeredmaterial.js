import assert from 'assert';
import ColorLayer from 'Layer/ColorLayer';
import TMSSource from 'Source/TMSSource';
import { updateLayeredMaterialNodeImagery } from 'Process/LayeredMaterialNodeProcessing';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import TileMesh from 'Core/TileMesh';
import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';
import OBB from 'Renderer/OBB';
import LayeredMaterial from 'Renderer/LayeredMaterial';
import Renderer from './bootstrap';

describe('material state vs layer state', function () {
    const renderer = new Renderer();
    const p = { coord: new Coordinates('EPSG:4326', -75.6114, 40.03428, 0), heading: 180, range: 4000, tilt: 22 };

    const view = new GlobeView(renderer.domElement, p, { renderer, noControls: true });
    const layer = new ColorLayer('color', { crs: 'EPSG:4326', source: new TMSSource({ crs: 'EPSG:4326', url: 'url' }) });
    view.tileLayer.colorLayersOrder = [layer.id];
    view.addLayer(layer);


    const extent = new Extent('TMS:4326', 3, 0, 0).as('EPSG:4326');
    const material = new LayeredMaterial();
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const node = new TileMesh(geom, material, view.tileLayer, extent);
    node.parent = { };

    const context = { view, scheduler: view.mainLoop.scheduler };

    it('should correctly initialize opacity & visibility', () => {
        updateLayeredMaterialNodeImagery(context, layer, node, node.parent);
        const nodeLayer = material.getLayer(layer.id);
        nodeLayer.textures.push(new THREE.Texture());
        assert.equal(nodeLayer.opacity, layer.opacity);
        assert.equal(nodeLayer.visible, layer.visible);
    });
    it('should update material opacity & visibility', () => {
        layer.opacity = 0.5;
        layer.visible = false;
        const nodeLayer = material.getLayer(layer.id);
        assert.equal(nodeLayer.opacity, layer.opacity);
        assert.equal(nodeLayer.visible, layer.visible);
    });
    it('should update material uniforms', () => {
        layer.visible = false;
        node.onBeforeRender();
        assert.equal(material.uniforms.colorLayers.value[0].id, undefined);

        layer.visible = true;
        node.onBeforeRender();
        assert.equal(material.uniforms.colorLayers.value[0].id, layer.id);
        assert.equal(material.uniforms.colorLayers.value[0].opacity, layer.opacity);
    });
});
