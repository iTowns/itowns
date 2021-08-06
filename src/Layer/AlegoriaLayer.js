import * as THREE from 'three';
import * as PhotogrammetricCamera from 'photogrammetric-camera';
import GeometryLayer from 'Layer/GeometryLayer';
import { viewMaterialOptions, uvTexture } from 'Utils/AlegoriaUtils';


/**
 * @classdesc AlegoriaLayer loads historical oriented images, and project these textures on the scene.
 * It is design to create an immersive view. </br>
 * It loads a set of oriented cameras, textures and materials, used to do projective texture mapping on the scene.
 * @extends GeometryLayer
 */
class AlegoriaLayer extends GeometryLayer {
    /**
     * @constructor
     * @param { string } id - The id of the layer, a unique name.
     * @param { Object } config - configuration of the layer
     * @param { string } config.crs - crs projection of the view
     * @param { AlegoriaSource } config.source - Charges textures and cameras from Json
     */
    constructor(id, config = {}) {
        /* istanbul ignore next */
        if (config.projection) {
            console.warn('AlegoriaLayer projection parameter is deprecated, use crs instead.');
            config.crs = config.crs || config.projection;
        }
        super(id, new THREE.Group(), config);

        this.isAlegoriaLayer = true;

        this.source.whenReady.then((data) => {
            this.textures = data.textures;
            this.cameras = data.cameras;
            this.object3d.add(this.cameras);
            this.newMaterial = new PhotogrammetricCamera.NewMaterial(viewMaterialOptions);
            this.newMaterial.map = uvTexture;
        });
    }

    // eslint-disable-next-line
    update() {
    }
}

export default AlegoriaLayer;
