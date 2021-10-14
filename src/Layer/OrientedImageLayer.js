import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import OrientedImageMaterial from 'Renderer/OrientedImageMaterial';
import GeoJsonParser from 'Parser/GeoJsonParser';
import CameraCalibrationParser from 'Parser/CameraCalibrationParser';
import Coordinates from 'Core/Geographic/Coordinates';
import OrientationUtils from 'Utils/OrientationUtils';

const coord = new Coordinates('EPSG:4978', 0, 0, 0);
const commandCancellation = cmd => cmd.requester.id !== cmd.layer.currentPano.id;

function updatePano(context, camera, layer) {
    const newPano = layer.mostNearPano(camera.position);
    // detection of oriented image change
    const currentId = layer.currentPano ? layer.currentPano.id : undefined;
    if (newPano && currentId != newPano.id) {
        layer.currentPano = newPano;

        // callback to indicate current pano has changed
        layer.onPanoChanged({
            previousPanoPosition: layer.getPreviousPano() ? layer.getPreviousPano().position : undefined,
            currentPanoPosition: layer.getCurrentPano().position,
            nextPanoPosition: layer.getNextPano().position,
        });
        // prepare informations about the needed textures
        const panoCameras = newPano.geometries[0].properties.idSensors;

        const imagesInfo = layer.cameras.map(cam => ({
            cameraId: cam.name,
            panoId: newPano.id,
            as: () => {},
        })).filter(info => !panoCameras || panoCameras.includes(info.cameraId));

        const command = {
            layer,
            // put informations about image URL as extent to be used by generic DataSourceProvider, OrientedImageSource will use that.
            extentsSource: imagesInfo,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: newPano,
            earlyDropFunction: commandCancellation,
        };

        // async call to scheduler to get textures
        context.scheduler.execute(command)
            .then((textures) => {
                if (newPano.id === layer.currentPano.id) {
                    layer.material.setTextures(textures, newPano, layer.getCamerasNameFromFeature(newPano));
                    layer.material.updateUniforms(context.camera.camera3D);
                    context.view.notifyChange(layer, true);
                }
            }, () => {});
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
     * @param { string } config.crs - crs projection of the view
     * @param { string } config.orientation - Json object, using GeoJSon format to represent points,
     * it's a set of panoramic position and orientation.
     * @param { string } config.calibrations - Json object, representing a set of camera. see [CameraCalibrationParser]{@link module:CameraCalibrationParser}
     * @param { OrientedImageSource } config.source - Source used to build url of texture for each oriented image,
     * a tecture is need for each camera, for each panoramic.
     */
    constructor(id, config = {}) {
        /* istanbul ignore next */
        if (config.projection) {
            console.warn('OrientedImageLayer projection parameter is deprecated, use crs instead.');
            config.crs = config.crs || config.projection;
        }
        super(id, new THREE.Group(), config);

        this.background = config.background || createBackground(config.backgroundDistance);
        this.isOrientedImageLayer = true;

        if (this.background) {
            this.object3d.add(this.background);
        }

        // currentPano is the current point, means it's the closest from the camera
        this.currentPano = undefined;

        // store a callback to fire event when current panoramic change
        this.onPanoChanged = config.onPanoChanged || (() => {});

        // function to get cameras name from panoramic feature
        this.getCamerasNameFromFeature = config.getCamerasNameFromFeature || (() => {});

        const resolve = this.addInitializationStep();

        this.mergeFeatures = false;
        this.filteringExtent = false;
        const options = { out: this };

        // panos is an array of feature point, representing many panoramics.
        // for each point, there is a position and a quaternion attribute.
        this.source.whenReady.then(metadata => GeoJsonParser.parse(config.orientation || metadata.orientation, options).then((orientation) =>  {
            this.panos = orientation.features;

            // the crs input is parsed in geojson parser
            // and returned in options.in
            const crsIn = options.in.crs;
            const crsOut = config.crs;
            const crs2crs = OrientationUtils.quaternionFromCRSToCRS(crsIn, crsOut);
            const quat = new THREE.Quaternion();

            // add position and quaternion attributes from point feature
            let i = 0;
            for (const pano of this.panos) {
                // set position
                coord.crs = pano.crs;
                coord.setFromArray(pano.vertices);
                pano.position = coord.toVector3();

                // set quaternion
                crs2crs(coord, quat);
                pano.quaternion = OrientationUtils.quaternionFromAttitude(pano.geometries[0].properties).premultiply(quat);

                pano.id = pano.geometries[0].properties.id;
                pano.index = i++;
            }
        }).then(() => {
            // array of cameras, represent the projective texture configuration for each panoramic.
            CameraCalibrationParser.parse(config.calibration  || metadata.calibration, config).then((cameras) => {
                this.cameras = cameras;
                // create the material
                this.material = new OrientedImageMaterial(this.cameras, config);
                resolve();
            });
        }));
    }

    // eslint-disable-next-line
    update() {
    }

    set boostLight(value) {
        this.material.uniforms.boostLight.value = value;
    }

    get boostLight() {
        return this.material.uniforms.boostLight.value;
    }

    preUpdate(context) {
        updatePano(context, context.camera.camera3D, this);
        this.material.updateUniforms(context.camera.camera3D);
        updateBackground(this);
    }

    getNextPano() {
        var index = (this.currentPano.index + 1) % this.panos.length;
        return this.panos[index];
    }

    getCurrentPano() {
        return this.currentPano;
    }

    getPreviousPano() {
        var index = (this.currentPano.index - 1) % this.panos.length;
        return this.panos[index];
    }

    /**
     * Delete background, but doesn't delete OrientedImageLayer.material. For the moment, this material visibility is set to false.
     * You need to replace OrientedImageLayer.material applied on each object, if you want to continue displaying them.
     * This issue (see #1018 {@link https://github.com/iTowns/itowns/issues/1018}) will be fixed when OrientedImageLayer will be a ColorLayer.
     */
    delete() {
        super.delete();
        this.material.visible = false;
        console.warn('You need to replace OrientedImageLayer.material applied on each object. This issue will be fixed when OrientedImageLayer will be a ColorLayer. the material visibility is set to false. To follow issue see https://github.com/iTowns/itowns/issues/1018');
    }

    mostNearPano(position) {
        let minDistance = Infinity;
        let nearPano;
        for (const pano of this.panos) {
            const distance = position.distanceTo(pano.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearPano = pano;
            }
        }
        return nearPano;
    }
}

export default OrientedImageLayer;
