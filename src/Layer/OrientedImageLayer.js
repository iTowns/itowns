import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import OrientedImageMaterial from 'Renderer/OrientedImageMaterial';
import GeoJsonParser from 'Parser/GeoJsonParser';
import CameraCalibrationParser from 'Parser/CameraCalibrationParser';
import Coordinates from 'Core/Geographic/Coordinates';
import OrientationUtils from 'Utils/OrientationUtils';

const coord = new Coordinates('EPSG:4978', 0, 0, 0);

function updatePano(context, camera, layer) {
    // look for the closest oriented image
    let minD = Infinity;
    let minI = -1;
    for (let i = 0; i < layer.panos.length; i++) {
        const position = layer.panos[i].position;
        const D = camera.position.distanceTo(position);
        if (D < minD) {
            minD = D;
            minI = i;
        }
    }
    // detection of oriented image change
    const newPano = layer.panos[minI];
    if (newPano && layer.currentPano != newPano) {
        layer.currentPano = newPano;

        // callback to indicate current pano has changed
        layer.onPanoChanged({
            currentPanoPosition: layer.getCurrentPano().position,
            nextPanoPosition: layer.getNextPano().position,
        });

        // prepare informations about the needed textures
        const imagesInfo = layer.cameras.map(cam =>  ({
            cameraId: cam.name,
            panoId: newPano.id,
        }));

        const command = {
            layer,
            // put informations about image URL as extent to be used by generic DataSourceProvider, OrientedImageSource will use that.
            extentsSource: imagesInfo,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: newPano,
        };

        // async call to scheduler to get textures
        context.scheduler.execute(command)
            .then(textures => layer.material.setTextures(textures, newPano));
    }
}

function updateBackground(layer) {
    if (layer.background && layer.currentPano) {
        layer.background.position.copy(layer.currentPano.position);
        layer.background.updateMatrixWorld();
        layer.background.material = layer.material || layer.background.material;
    }
}

function createBackground(radius) {
    if (!radius || radius <= 0) { return undefined; }
    var geometry = new THREE.SphereGeometry(radius, 32, 32);
    var material = new THREE.MeshPhongMaterial({
        color: 0x7777ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        wireframe: true,
    });
    var sphere = new THREE.Mesh(geometry, material);
    sphere.visible = true;
    sphere.name = 'OrientedImageBackground';
    return sphere;
}

/**
 * @classdesc OrientedImageLayer loads oriented images, and project these textures on the scene.
 * It is design to create an immersive view. </br>
 * It loads a set of panoramic position and orientation,
 * a set of camera calibration file (it's the same set of camera for each panoramic),
 * and a set of texture (each image for each camera for each panoramic), all organised in an {@link OrientedImageSource}. </br>
 * It creates an {@link OrientedImageMaterial} used to do projective texture mapping on the scene.
 * @extends GeometryLayer
 */
class OrientedImageLayer extends GeometryLayer {
    /**
     * @constructor
     * @param { string } id - The id of the layer, a unique name.
     * @param { Object } config - configuration of the layer
     * @param { number } config.backgroundDistance - Radius in meter of the sphere used as a background
     * @param { function } config.onPanoChanged - callback fired when current panoramic changes
     * @param { string } config.projection - projection of the view
     * @param { string } config.orientation - Json object, using GeoJSon format to represent points,
     * it's a set of panoramic position and orientation.
     * @param { string } config.calibrations - Json object, representing a set of camera. see [CameraCalibrationParser]{@link module:CameraCalibrationParser}
     * @param { OrientedImageSource } config.source - Source used to build url of texture for each oriented image,
     * a tecture is need for each camera, for each panoramic.
     */
    constructor(id, config = {}) {
        super(id, new THREE.Group(), config);

        this.background = config.background || createBackground(config.backgroundDistance);

        this.object3d.add(this.background);

        // currentPano is the current point, means it's the closest from the camera
        this.currentPano = undefined;

        // store a callback to fire event when current panoramic change
        this.onPanoChanged = config.onPanoChanged || (() => {});

        // panos is an array of feature point, representing many panoramics.
        // for each point, there is a position and a quaternion attribute.
        const p1 = GeoJsonParser.parse(config.orientation, {
            mergeFeatures: false,
            crsOut: config.projection }).then((res) =>  {
            this.panos = res.features;

            // we need to know if we are in globe view, for orientation.
            const isGlobe = config.projection == 'EPSG:4978';

            // add position and quaternion attributes from point feature
            let i = 0;
            for (const pano of this.panos) {
                // set position
                coord.set(pano.crs, pano.vertices[0], pano.vertices[1], pano.vertices[2]);
                pano.position = coord.xyz();
                // set quaternion
                pano.quaternion = OrientationUtils.quaternionFromAttitude(pano.geometry[0].properties, coord, isGlobe);

                // TODO clean DataSourceProvider, so that we don't have this hack to do
                pano.material = {};
                pano.id = pano.geometry[0].properties.id;
                pano.index = i++;
            }
        });

        // array of cameras, represent the projective texture configuration for each panoramic.
        const p2 = CameraCalibrationParser.parse(config.calibration, {}).then((c) => {
            this.cameras = c;
            // create the material
            this.material = new OrientedImageMaterial(this.cameras);
        });


        // wait for the twos promises to tell layer is ready.
        this.whenReady = Promise.all([p1, p2]).then(() => {
            this.ready = true;
            return this;
        });
    }

    // eslint-disable-next-line
    update() {
    }

    preUpdate(context) {
        this.material.updateUniforms(context.camera.camera3D);
        updatePano(context, context.camera.camera3D, this);
        updateBackground(this);
    }

    getNextPano() {
        var index = (this.currentPano.index + 1) % this.panos.length;
        return this.panos[index];
    }

    getCurrentPano() {
        return this.currentPano;
    }
}

export default OrientedImageLayer;
