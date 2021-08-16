import * as THREE from 'three';
import * as PhotogrammetricCamera from 'photogrammetric-camera';
import GeometryLayer from 'Layer/GeometryLayer';
import { viewMaterialOptions, uvTexture, sphereRadius } from 'Utils/AlegoriaUtils';


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

        const materialOptionsWithBuildingDates = {};
        Object.assign(materialOptionsWithBuildingDates, viewMaterialOptions);
        materialOptionsWithBuildingDates.defines = materialOptionsWithBuildingDates.defines || {};
        materialOptionsWithBuildingDates.defines.USE_BUILDING_DATE = '';

        this.newMaterial = new PhotogrammetricCamera.NewMaterial(materialOptionsWithBuildingDates);
        this.newMaterial.map = uvTexture;

        this.multiTextureMaterial = new PhotogrammetricCamera.MultiTextureMaterial({ numTextures: 3, maxTextures: 50, sigma: 1000 });
        this.multiTextureMaterial.setScreenSize(window.innerWidth, window.innerHeight);

        this.spriteMaterial = new PhotogrammetricCamera.SpriteMaterial();
        this.spriteMaterial.setScreenSize(window.innerWidth, window.innerHeight);

        this.multiTextureSpriteMaterial = new PhotogrammetricCamera.MultiTextureSpriteMaterial({ numTextures: 3, maxTextures: 50, sigma: 1000 });
        this.multiTextureSpriteMaterial.setScreenSize(window.innerWidth, window.innerHeight);

        const sphereMaterialOptions = {};
        Object.assign(sphereMaterialOptions, viewMaterialOptions);
        sphereMaterialOptions.opacity = 0.5;
        this.sphereMaterial = new PhotogrammetricCamera.NewMaterial(sphereMaterialOptions);
        this.spriteMaterial.map = uvTexture;
        this.sphereMaterial.opacity = 0.75;

        this.sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(-1, 32, 32), this.sphereMaterial);
        this.sphere.scale.set(sphereRadius, sphereRadius, sphereRadius);
        this.sphere.updateMatrixWorld();
        this.object3d.add(this.sphere);

        this.source.whenReady.then((data) => {
            this.textures = data.textures;
            this.cameras = data.cameras;
            this.object3d.add(this.cameras);
        });
    }

    // eslint-disable-next-line
    update(context) {
        this.spriteMaterial.setViewCamera(context.camera.camera3D);
        this.multiTextureSpriteMaterial.setViewCamera(context.camera.camera3D);
        context.camera.camera3D.getWorldPosition(this.sphere.position);
        this.sphere.updateMatrixWorld();
    }
}

export default AlegoriaLayer;
