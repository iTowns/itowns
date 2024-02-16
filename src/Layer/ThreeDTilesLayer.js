import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/GLTFParser';

// TODO: Check GeometryLayer methods that should be overriden
// TODO: tests
// TODO: how to avoid passing camera3D and renderer in constructor?
class ThreeDTilesLayer extends GeometryLayer {
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isThreeDTilesLayer = true;

        // TODO: use only one GLTFLoader instance (itowns one to create that supports 1.0 and 2.0 gltf out of the box)
        const loader = new iGLTFLoader();
        // TODO: le dracoLoader et KTX2Loader seront set directement sur le GLTFLoader d'itowns (du coup on pourra virer
        // les deux fonctions statiques enableDracoLoader et enableKTX2Loader)
        this.tilesRenderer = new TilesRenderer(this.source.url);
        this.tilesRenderer.manager.addHandler(/\.gltf$/, loader);
        this.object3d.add(this.tilesRenderer.group);
    }

    preUpdate() {
        this.tilesRenderer.update();
        return null; // don't return any element because 3d-tiles-renderer updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    // TODO: what happens if the layer is added to multiple views? Should we store multiple tilesRenderer?
    // How does it work for other layer types?
    setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // Set this in the method called by view.addLayer
        this.tilesRenderer.onLoadTileSet = (tileSet) => {
            this.tileSet = tileSet; // TODO: needed? + what if multiple tilesets?
            view.notifyChange(this);
        };
        this.tilesRenderer.onLoadModel = (model) => {
            // TODO: need to store model?
            view.notifyChange(this); // TODO: specify this layer?
        };
    }
}

export default ThreeDTilesLayer;
