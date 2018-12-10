import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import textureVS from 'Renderer/Shader/ProjectiveTextureVS.glsl';
import textureFS from 'Renderer/Shader/ProjectiveTextureFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';

var ndcToTextureMatrix = new THREE.Matrix4().set(
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 2, 0,
    0, 0, 0, 2);

/**
 * @classdesc OrientedImageMaterial is a custom shader material used to do projective texture mapping.<br/>
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
 *  - radial distortion (polynom!=vec3(0),l1l2==vec2(0)) (see <b>15.2.2 Radial Model</b> in [MicMac doc]{@link https://github.com/micmacIGN/Documentation/blob/master/DocMicMac.pdf}) </br>
 *  - equilinear fish eye distortion (polynom!=vec3(0),l1l2 != vec2(0)) (see <b>15.3.4 Fish eye models</b> in [MicMac doc]{@link https://github.com/micmacIGN/Documentation/blob/master/DocMicMac.pdf}) </br>
 * (Note: radial decentric parameters P1 are P2 not supported and assumed to be 0).<br/>
 * <br/>
 * To get a more comprehensive support of camera Micmac models, you can consider using [three-photogrammetric-camera]{@link https://github.com/mbredif/three-photogrammetric-camera} instead.
 */
class OrientedImageMaterial extends THREE.RawShaderMaterial {
    /**
     * @constructor
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
        options.side = options.side !== undefined ? options.side : THREE.DoubleSide;
        options.transparent = options.transparent !== undefined ? options.transparent : true;
        options.opacity = options.opacity !== undefined ? options.opacity : 0.1;
        super(options);

        this.defines.NUM_TEXTURES = cameras.length;

        // verify that number of textures doesn't exceed GPU capabilities
        const maxTexturesUnits = Capabilities.getMaxTextureUnitsCount();
        if (this.defines.NUM_TEXTURES > maxTexturesUnits) {
            console.warn(`OrientedImageMaterial: Can't project ${cameras.length} textures, because it's more than GPU capabilities maximum texture units (${maxTexturesUnits})`);

            // Clamp number of textures used
            this.defines.NUM_TEXTURES = maxTexturesUnits - 1;
            console.warn(`OrientedImageMaterial: We'll use only the first ${this.defines.NUM_TEXTURES} cameras.`);
        }

        this.defines.USE_DISTORTION = Number(cameras.some(camera => camera.distortion !== undefined));
        this.alphaBorder = options.alphaBorder | 20;
        this.defines.DEBUG_ALPHA_BORDER = options.debugAlphaBorder | 0;
        this.cameras = cameras;
        const textureMatrix = [];
        const texture = [];
        const distortion = [];
        this.group = new THREE.Group();

        for (let i = 0; i < this.defines.NUM_TEXTURES; ++i) {
            const camera = cameras[i];
            camera.needsUpdate = true;
            camera.textureMatrix = new THREE.Matrix4();
            camera.textureMatrixWorldInverse = new THREE.Matrix4();
            textureMatrix[i] = new THREE.Matrix4();
            texture[i] = new THREE.Texture();
            distortion[i] = {};
            distortion[i].size = camera.size;
            if (camera.distortion) {
                distortion[i].polynom = camera.distortion.polynom;
                distortion[i].pps = camera.distortion.pps;
                distortion[i].l1l2 = camera.distortion.l1l2;
            }
            this.group.add(camera);
        }

        this.uniforms.projectiveTextureAlphaBorder = new THREE.Uniform(this.alphaBorder);
        this.uniforms.projectiveTextureDistortion = new THREE.Uniform(distortion);
        this.uniforms.projectiveTextureMatrix = new THREE.Uniform(textureMatrix);
        this.uniforms.projectiveTexture = new THREE.Uniform(texture);

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        this.vertexShader = textureVS;
        this.fragmentShader = ShaderUtils.unrollLoops(textureFS, this.defines);
    }

    /**
     * Set new textures and new position/orientation of the camera set.
     * @param {THREE.Texture} textures - Array of [THREE.Texture]{@link https://threejs.org/docs/#api/en/textures/Texture}.
     * @param {Object} feature - New position / orientation of the set of cameras
     * @param {THREE.Vector3} feature.position - New position.
     * @param {THREE.Quaternion} feature.quaternion - New orientation.
     */
    setTextures(textures, feature) {
        if (!textures) { return; }
        this.group.position.copy(feature.position);
        this.group.quaternion.copy(feature.quaternion);
        this.group.updateMatrixWorld(true); // update the matrixWorldInverse of the cameras

        for (let i = 0; i < textures.length && i < this.defines.NUM_TEXTURES; ++i) {
            var oldTexture = this.uniforms.projectiveTexture.value[i];
            this.uniforms.projectiveTexture.value[i] = textures[i];
            if (oldTexture) {
                oldTexture.dispose();
            }
            this.cameras[i].needsUpdate = true;
        }
    }

    /**
     * Udate the uniforms using the current value of camera.matrixWorld.
     * Need to be called when the camera of the scene has changed.
     * @param {THREE.Camera} viewCamera - Camera of the scene.
     */
    updateUniforms(viewCamera) {
        for (var i = 0; i < this.defines.NUM_TEXTURES; ++i) {
            const camera = this.cameras[i];
            if (camera.needsUpdate) {
                camera.updateMatrixWorld(true);
                camera.textureMatrix.multiplyMatrices(ndcToTextureMatrix, camera.projectionMatrix);
                camera.textureMatrixWorldInverse.multiplyMatrices(camera.textureMatrix, camera.matrixWorldInverse);
                camera.needsUpdate = false;
            }
            this.uniforms.projectiveTextureMatrix.value[i].multiplyMatrices(camera.textureMatrixWorldInverse, viewCamera.matrixWorld);
        }
    }
}

export default OrientedImageMaterial;
