import * as THREE from 'three';
import OrientedImageCamera from 'Renderer/OrientedImageCamera';

/**
 * The CameraCalibrationParser module provide a [parse]{@link module:CameraCalibrationParser.parse}
 * method that takes a JSON array of camera calibrations in and yields an array of {@link OrientedImageCamera}
 *
 * @module CameraCalibrationParser
 */

const xAxis = new THREE.Vector3();
const yAxis = new THREE.Vector3();
const zAxis = new THREE.Vector3();
const textureLoader = new THREE.TextureLoader();
const matrix3 = new THREE.Matrix3();

THREE.Matrix4.prototype.makeBasisFromMatrix = function makeBasisFromMatrix(m) {
    m.extractBasis(xAxis, yAxis, zAxis);
    return this.makeBasis(xAxis, yAxis, zAxis);
};

// the json format encodes the following transformation:
// extrinsics: p_local = rotation * (p_world - position)
// intrinsics: p_pixel = projection * p_local
// distortion: p_raw = distortion(p_pixel)
function parseCalibration(calibration, options = {}) {
    const useMask = options.useMask == undefined ? true : options.useMask;
    const imageYDown = options.imageYDown == undefined ? true : options.imageYDown;
    // parse intrinsics
    const proj = calibration.projection;
    const size = new THREE.Vector2().fromArray(calibration.size);
    const focal = new THREE.Vector2(proj[0], proj[4]);
    // Center of image,  convention in digital image is Y dow
    // To transform image space to webGl texture. It could inverse Y axis.
    const center = new THREE.Vector2(proj[2], imageYDown ? size.y - proj[5] : proj[5]);
    const skew = proj[1];
    const camera = new OrientedImageCamera(size, focal, center, options.near, options.far, skew);

    // parse extrinsics: Object3d.matrix is from local to world
    // p_world = position + transpose(rotation) * p_local
    camera.position.fromArray(calibration.position);
    // calibration.rotation is row-major but fromArray expects a column-major array, yielding the transposed matrix
    const rotationInverse = matrix3.fromArray(calibration.rotation);
    camera.matrix.makeBasisFromMatrix(rotationInverse);
    camera.quaternion.setFromRotationMatrix(camera.matrix);

    // local axes for cameras is (X right, Y up, Z back) rather than (X right, Y down, Z front)
    camera.rotateX(Math.PI);

    if (calibration.distortion) {
        camera.distortion.setFromMicmacCalibration(calibration.distortion, imageYDown);
    }

    camera.maskPath = calibration.mask;
    camera.name = calibration.id;

    let resolve;
    const deferred = new Promise((r) => { resolve = r; });
    if (useMask && camera.maskPath) {
        textureLoader.load(camera.maskPath,
            (mask) => {
                camera.maskTexture = mask;
                resolve(camera);
            });
    } else {
        resolve(camera);
    }
    return deferred;
}

export default {
    /**
     * Description of a camera calibration in a JSON file.
     *
     * @typedef CameraCalibrationJson
     * @type {Object}
     *
     * @property {number[]} projection - projection matrix,
     * @property {number[]} size - image size in pixel.
     * @property {number[]} position - position of the camera.
     * @property {number[]} rotation - rotation matrix
     * @property {Object} [distorsion={}] - distorsion
     * @property {number[]} [distorsion.pps]
     * @property {number[]} [distorsion.poly357]
     * @property {number[]} [distorsion.limit]
     * @property {number[]} [distorsion.l1l2]
     * @property {number[]} [distorsion.etat]
     */
    /**
     * Parser a JSON array of camera calibrations and return an array of {@link OrientedImageCamera}.
     * @param {string|JSON} json - the json content of the calibration file.
     * @param {Object} [options={}] - Options controlling the parsing.
     * @param {string} [options.near=0.1] - Near of the created cameras. Default value comes from created {@link OrientedImageCamera}
     * @param {string} [options.far=1000] - Far of the created cameras. Default value comes from created {@link OrientedImageCamera}
     * @return {Promise} - A promise resolving with an array of {@link OrientedImageCamera}.
     */
    parse(json, options = {}) {
        if (typeof (json) === 'string') {
            json = JSON.parse(json);
        }
        return Promise.all(json.map(calibration => parseCalibration(calibration, options)));
    },
};
