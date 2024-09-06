import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import textureVS from 'Renderer/Shader/ProjectiveTextureVS.glsl';
import textureFS from 'Renderer/Shader/ProjectiveTextureFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';

const ndcToTextureMatrix = new THREE.Matrix4(
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 2, 0,
    0, 0, 0, 2);

const noMask = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
noMask.needsUpdate = true;
const noTexture = new THREE.Texture();

const shaderMaterial = new THREE.ShaderMaterial();
/**
 * OrientedImageMaterial is a custom shader material used to do projective texture mapping.<br/>
 *
 * This Material is designed to project many textures simultaneously.
 * Each projected texture setting is stored as an {@link OrientedImageCamera}.<br/>
 * <br/>
 * All cameras settings, like distorsion, can be specified in a configuration file.
 * See [CameraCalibrationParser]{@link module:CameraCalibrationParser.parse}
 * used to parse a configuration file and create an array of camera.<br/>
 * <br/>
 * The current implementation supports the following distortion models : <br/>
 *  - no distortion (polynom==vec3(0),l1l2==vec2(0))<br/>
 *  - radial distortion (polynom!=vec3(0),l1l2==vec2(0)) (see <b>15.2.2 Radial Model</b> in [MicMac doc](https://github.com/micmacIGN/Documentation/blob/master/DocMicMac.pdf)) </br>
 *  - equilinear fish eye distortion (polynom!=vec3(0),l1l2 != vec2(0)) (see <b>15.3.4 Fish eye models</b> in [MicMac doc](https://github.com/micmacIGN/Documentation/blob/master/DocMicMac.pdf)) </br>
 * (Note: radial decentric parameters P1 are P2 not supported and assumed to be 0).<br/>
 * <br/>
 * To get a more comprehensive support of camera Micmac models, you can consider using [three-photogrammetric-camera]{@link https://github.com/mbredif/three-photogrammetric-camera} instead.
 */
class OrientedImageMaterial extends THREE.ShaderMaterial {
    /**
     * @param { OrientedImageCamera[]} cameras - Array of {@link OrientedImageCamera}. Each camera will project a texture.
     * [CameraCalibrationParser]{@link module:CameraCalibrationParser.parse} can used to create this array of camera from a configuration file.
     * @param {Object} [options={}] - Object with one or more properties defining the material's appearance.
     * Any property of the material (including any property inherited from
     * [THREE.Material]{@link https://threejs.org/docs/#api/en/materials/Material} and
     * [THREE.ShaderMaterial]{@link https://threejs.org/docs/#api/en/materials/ShaderMaterial}) can be passed in here.
     * @param {Number} [options.side=THREE.DoubleSide] - We override default
     * [THREE.Material.side]{@link https://threejs.org/docs/#api/en/materials/Material.side} from FrontSide to DoubleSide.
     * @param {Boolean} [options.transparent=true] - We override default
     * [THREE.Material.transparent]{@link https://threejs.org/docs/#api/en/materials/Material.transparent} from false to true.
     * @param {Number} [options.opacity=0.1] - We override default
     * [THREE.Material.opacity]{@link https://threejs.org/docs/#api/en/materials/Material.opacity} from 1 to 0.1.
     * @param {Number} [options.alphaBorder=20] - Part of the texture that is blended, when texture crosses each other.
     * For example, 10 means a border as large as 1 / 10 of the size of the texture is used to blend colors.
     * @param {Number} [options.debugAlphaBorder=0] - Set this option to 1 to see influence of alphaBorder option.
     */
    constructor(cameras, options = {}) {
        options.side = options.side ?? THREE.DoubleSide;
        options.transparent = options.transparent ?? true;
        options.opacity = options.opacity ?? 1;

        // Filter out non-ShaderMaterial options
        const shaderMaterialOptions = {};
        for (const key in options) {
            if (Object.prototype.hasOwnProperty.call(options, key)) {
                const currentValue = shaderMaterial[key];
                if (currentValue !== undefined) {
                    shaderMaterialOptions[key] = options[key];
                }
            }
        }
        super(shaderMaterialOptions);

        this.defines.ORIENTED_IMAGES_COUNT = options.OrientedImagesCount ?? cameras.length;

        // verify that number of textures doesn't exceed GPU capabilities
        const maxTexturesUnits = Capabilities.getMaxTextureUnitsCount();
        if (this.defines.ORIENTED_IMAGES_COUNT > maxTexturesUnits) {
            console.warn(`OrientedImageMaterial: Can't project ${cameras.length} textures, because it's more than GPU capabilities maximum texture units (${maxTexturesUnits})`);

            // Clamp number of textures used
            this.defines.ORIENTED_IMAGES_COUNT = maxTexturesUnits - 1;
            console.warn(`OrientedImageMaterial: We'll use only the first ${this.defines.ORIENTED_IMAGES_COUNT} cameras.`);
        }

        if (options.useBaseMaterial) {
            this.defines.USE_BASE_MATERIAL = true;
        }
        this.defines.USE_DISTORTION = Number(cameras.some(camera => camera.distortion.pps !== null));
        this.alphaBorder = options.alphaBorder | 20;
        this.defines.DEBUG_ALPHA_BORDER = options.debugAlphaBorder | 0;
        this.cameras = cameras;

        const textureMatrix = [];
        const texture = [];
        const mask = [];
        const distortion = [];
        this.group = new THREE.Group();

        for (let i = 0; i < this.defines.ORIENTED_IMAGES_COUNT; ++i) {
            texture[i] = noTexture;
            mask[i] = noMask;
            textureMatrix[i] = new THREE.Matrix4();
            cameras[i].needsUpdate = true;
            distortion[i] = cameras[i].distortion;
            this.group.add(cameras[i]);
        }

        this.uniforms.opacity = new THREE.Uniform(this.opacity);
        this.uniforms.projectiveTextureAlphaBorder = new THREE.Uniform(this.alphaBorder);
        this.uniforms.projectiveTextureDistortion = new THREE.Uniform(distortion);
        this.uniforms.projectiveTextureMatrix = new THREE.Uniform(textureMatrix);
        this.uniforms.projectiveTexture = new THREE.Uniform(texture);
        this.uniforms.mask = new THREE.Uniform(mask);
        this.uniforms.boostLight = new THREE.Uniform(false);

        this.uniforms.noProjectiveMaterial = new THREE.Uniform({
            lightDirection: new THREE.Vector3(0.5, 0.5, -0.5),
            ambient: new THREE.Color(0.1, 0.1, 0.1),
            opacity: 0.75,
        });

        this.vertexShader = textureVS;
        // three loop unrolling of ShaderMaterial only supports integer bounds,
        // see https://github.com/mrdoob/three.js/issues/28020
        this.fragmentShader = ShaderUtils.unrollLoops(textureFS, this.defines);
    }

    /**
     * Set new textures and new position/orientation of the camera set.
     * @param {THREE.Texture} textures - Array of [THREE.Texture]{@link https://threejs.org/docs/#api/en/textures/Texture}.
     * @param {Object} feature - New position / orientation of the set of cameras
     * @param {THREE.Vector3} feature.position - New position.
     * @param {THREE.Quaternion} feature.quaternion - New orientation.
     * @param {Array} camerasNames - camera names of panoramic feature
     */
    setTextures(textures, feature, camerasNames) {
        if (!textures) { return; }
        this.group.position.copy(feature.position);
        this.group.quaternion.copy(feature.quaternion);

        for (let i = 0; i < textures.length && i < this.defines.ORIENTED_IMAGES_COUNT; ++i) {
            this.uniforms.projectiveTexture.value[i].dispose();
            this.uniforms.projectiveTexture.value[i] = textures[i];

            // check camera changes
            if (camerasNames) {
                const currentCamera = this.group.children[i];
                if (camerasNames[i] != currentCamera.name) {
                    const camera = this.cameras.find(cam => cam.name === camerasNames[i]);
                    this.uniforms.mask.value[i] = camera.maskTexture || noMask;
                    this.uniforms.mask.value[i].needsUpdate = true;
                    this.uniforms.projectiveTextureDistortion.value[i] = camera.distortion;
                    this.group.children[i] = camera;
                    camera.parent = this.group;
                }
            }
            this.group.children[i].needsUpdate = true;
        }
        this.group.updateMatrixWorld(true); // update the matrixWorldInverse of the cameras
    }

    /**
     * Udate the uniforms using the current value of camera.matrixWorld.
     * Need to be called when the camera of the scene has changed.
     * @param {THREE.Camera} viewCamera - Camera of the scene.
     */
    updateUniforms(viewCamera) {
        for (let i = 0; i < this.group.children.length; ++i) {
            const camera = this.group.children[i];
            if (camera.needsUpdate) {
                camera.textureMatrixWorldInverse.multiplyMatrices(ndcToTextureMatrix, camera.projectionMatrix);
                camera.textureMatrixWorldInverse.multiply(camera.matrixWorldInverse);
                camera.needsUpdate = false;
            }
            this.uniforms.projectiveTextureMatrix.value[i].multiplyMatrices(camera.textureMatrixWorldInverse, viewCamera.matrixWorld);
        }
    }
}

export default OrientedImageMaterial;
