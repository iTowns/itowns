import * as THREE from 'three';
import PointsVS from 'Renderer/Shader/PointsVS.glsl';
import PointsFS from 'Renderer/Shader/PointsFS.glsl';
import Capabilities from 'Core/System/Capabilities';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import CommonMaterial from 'Renderer/CommonMaterial';

export const PNTS_MODE = {
    COLOR: 0,
    INTENSITY: 1,
    CLASSIFICATION: 2,
    NORMAL: 3,
    RETURN_NUMBER: 4,
    NUMBER_OF_RETURNS: 5,
    POINT_SOURCE_ID: 6,
    ELEVATION: 7,
};

export const PNTS_SHAPE = {
    CIRCLE: 0,
    SQUARE: 1,
};

export const PNTS_SIZE_MODE = {
    VALUE: 0,
    ATTENUATED: 1,
};

const white = new THREE.Color(1.0,  1.0,  1.0);

// Viridis color scheme
// Adapted from matplotlib
// https://github.com/matplotlib/matplotlib/blob/d60de5ed4d374d688463a1a49684f6cd1dbdd0d5/lib/matplotlib/_cm_listed.py#L774
const viridis = [
    '#440154', '#440255', '#440357', '#450558', '#45065a', '#45085b', '#46095c',
    '#460b5e', '#460c5f', '#460e61', '#470f62', '#471163', '#471265', '#471466',
    '#471567', '#471669', '#47186a', '#48196b', '#481a6c', '#481c6e', '#481d6f',
    '#481e70', '#482071', '#482172', '#482273', '#482374', '#472575', '#472676',
    '#472777', '#472878', '#472a79', '#472b7a', '#472c7b', '#462d7c', '#462f7c',
    '#46307d', '#46317e', '#45327f', '#45347f', '#453580', '#453681', '#443781',
    '#443982', '#433a83', '#433b83', '#433c84', '#423d84', '#423e85', '#424085',
    '#414186', '#414286', '#404387', '#404487', '#3f4587', '#3f4788', '#3e4888',
    '#3e4989', '#3d4a89', '#3d4b89', '#3d4c89', '#3c4d8a', '#3c4e8a', '#3b508a',
    '#3b518a', '#3a528b', '#3a538b', '#39548b', '#39558b', '#38568b', '#38578c',
    '#37588c', '#37598c', '#365a8c', '#365b8c', '#355c8c', '#355d8c', '#345e8d',
    '#345f8d', '#33608d', '#33618d', '#32628d', '#32638d', '#31648d', '#31658d',
    '#31668d', '#30678d', '#30688d', '#2f698d', '#2f6a8d', '#2e6b8e', '#2e6c8e',
    '#2e6d8e', '#2d6e8e', '#2d6f8e', '#2c708e', '#2c718e', '#2c728e', '#2b738e',
    '#2b748e', '#2a758e', '#2a768e', '#2a778e', '#29788e', '#29798e', '#287a8e',
    '#287a8e', '#287b8e', '#277c8e', '#277d8e', '#277e8e', '#267f8e', '#26808e',
    '#26818e', '#25828e', '#25838d', '#24848d', '#24858d', '#24868d', '#23878d',
    '#23888d', '#23898d', '#22898d', '#228a8d', '#228b8d', '#218c8d', '#218d8c',
    '#218e8c', '#208f8c', '#20908c', '#20918c', '#1f928c', '#1f938b', '#1f948b',
    '#1f958b', '#1f968b', '#1e978a', '#1e988a', '#1e998a', '#1e998a', '#1e9a89',
    '#1e9b89', '#1e9c89', '#1e9d88', '#1e9e88', '#1e9f88', '#1ea087', '#1fa187',
    '#1fa286', '#1fa386', '#20a485', '#20a585', '#21a685', '#21a784', '#22a784',
    '#23a883', '#23a982', '#24aa82', '#25ab81', '#26ac81', '#27ad80', '#28ae7f',
    '#29af7f', '#2ab07e', '#2bb17d', '#2cb17d', '#2eb27c', '#2fb37b', '#30b47a',
    '#32b57a', '#33b679', '#35b778', '#36b877', '#38b976', '#39b976', '#3bba75',
    '#3dbb74', '#3ebc73', '#40bd72', '#42be71', '#44be70', '#45bf6f', '#47c06e',
    '#49c16d', '#4bc26c', '#4dc26b', '#4fc369', '#51c468', '#53c567', '#55c666',
    '#57c665', '#59c764', '#5bc862', '#5ec961', '#60c960', '#62ca5f', '#64cb5d',
    '#67cc5c', '#69cc5b', '#6bcd59', '#6dce58', '#70ce56', '#72cf55', '#74d054',
    '#77d052', '#79d151', '#7cd24f', '#7ed24e', '#81d34c', '#83d34b', '#86d449',
    '#88d547', '#8bd546', '#8dd644', '#90d643', '#92d741', '#95d73f', '#97d83e',
    '#9ad83c', '#9dd93a', '#9fd938', '#a2da37', '#a5da35', '#a7db33', '#aadb32',
    '#addc30', '#afdc2e', '#b2dd2c', '#b5dd2b', '#b7dd29', '#bade27', '#bdde26',
    '#bfdf24', '#c2df22', '#c5df21', '#c7e01f', '#cae01e', '#cde01d', '#cfe11c',
    '#d2e11b', '#d4e11a', '#d7e219', '#dae218', '#dce218', '#dfe318', '#e1e318',
    '#e4e318', '#e7e419', '#e9e419', '#ece41a', '#eee51b', '#f1e51c', '#f3e51e',
    '#f6e61f', '#f8e621', '#fae622', '#fde724',
];

/**
 * Every lidar point can have a classification assigned to it that defines
 * the type of object that has reflected the laser pulse. Lidar points can be
 * classified into a number of categories including bare earth or ground,
 * top of canopy, and water. The different classes are defined using numeric
 * integer codes in the files.
 *
 * @property {object} category - category classification,
 * @property {boolean} category.visible - category visibility,
 * @property {string} category.name - category name,
 * @property {THREE.Color} category.color - category color,
 * @property {number} category.opacity - category opacity,
 */
// eslint-disable-next-line
class /* istanbul ignore next */ Classification {}

export const ClassificationScheme = {
    DEFAULT: {
        0: { visible: true, name: 'never classified', color: new THREE.Color(0.5,  0.5,  0.5), opacity: 1.0 },
        1: { visible: true, name: 'unclassified', color: new THREE.Color(0.5,  0.5,  0.5), opacity: 1.0 },
        2: { visible: true, name: 'ground', color: new THREE.Color(0.63, 0.32, 0.18), opacity: 1.0 },
        3: { visible: true, name: 'low vegetation', color: new THREE.Color(0.0,  1.0,  0.0), opacity: 1.0 },
        4: { visible: true, name: 'medium vegetation', color: new THREE.Color(0.0,  0.8,  0.0), opacity: 1.0 },
        5: { visible: true, name: 'high vegetation', color: new THREE.Color(0.0,  0.6,  0.0), opacity: 1.0 },
        6: { visible: true, name: 'building', color: new THREE.Color(1.0,  0.66, 0.0), opacity: 1.0 },
        7: { visible: true, name: 'low point(noise)', color: new THREE.Color(1.0,  0.0,  1.0), opacity: 1.0 },
        8: { visible: true, name: 'key-point', color: new THREE.Color(1.0,  0.0,  0.0), opacity: 1.0 },
        9: { visible: true, name: 'water', color: new THREE.Color(0.0,  0.0,  1.0), opacity: 1.0 },
        10: { visible: true, name: 'rail', color: new THREE.Color(0.8,  0.8,  1.0), opacity: 1.0 },
        11: { visible: true, name: 'road Surface', color: new THREE.Color(0.4,  0.4,  0.7), opacity: 1.0 },
        12: { visible: true, name: 'overlap', color: new THREE.Color(1.0,  1.0,  0.0), opacity: 1.0 },
        DEFAULT: { visible: true, name: 'default', color: new THREE.Color(0.3,  0.6,  0.6), opacity: 0.5 },
    },
};

class PointsMaterial extends THREE.RawShaderMaterial {
    /**
     * @class      PointsMaterial
     * @param      {object}  [options={}]  The options
     * @param      {number}  [options.size=0]  size point
     * @param      {number}  [options.mode=PNTS_MODE.COLOR]  display mode.
     * @param      {number}  [options.mode=PNTS_SHAPE.CIRCLE]  rendered points shape.
     * @param      {THREE.Vector4}  [options.overlayColor=new THREE.Vector4(0, 0, 0, 0)]  overlay color.
     * @param      {THREE.Vector2}  [options.intensityRange=new THREE.Vector2(0, 1)]  intensity range.
     * @param      {THREE.Vector2}  [options.elevationRange=new THREE.Vector2(0, 1)] - elevation range.
     * @param      {boolean}  [options.applyOpacityClassication=false]  apply opacity classification on all display mode.
     * @param      {Classification}  [options.classification] -  define points classification.
     * @param      {number}  [options.sizeMode=PNTS_SIZE_MODE.VALUE]  point cloud size mode. Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance from point to camera.
     * @param      {number}  [options.minAttenuatedSize=3]  minimum scale used by 'ATTENUATED' size mode
     * @param      {number}  [options.maxAttenuatedSize=10]  maximum scale used by 'ATTENUATED' size mode
     * @property {Classification}  classification - points classification.
     *
     * @example
     * // change color category classification
     * const pointMaterial = new PointsMaterial();
     * pointMaterial.classification[3].color.setStyle('red');
     * pointMaterial.recomputeClassification();
     */
    constructor(options = {}) {
        const intensityRange = options.intensityRange || new THREE.Vector2(0, 1);
        const elevationRange = options.elevationRange || new THREE.Vector2(0, 1);
        const oiMaterial = options.orientedImageMaterial;
        const classification = options.classification || ClassificationScheme.DEFAULT;
        const applyOpacityClassication = options.applyOpacityClassication == undefined ? false : options.applyOpacityClassication;
        const size = options.size || 0;
        const mode = options.mode || PNTS_MODE.COLOR;
        const shape = options.shape || PNTS_SHAPE.CIRCLE;
        const sizeMode = size === 0 ? PNTS_SIZE_MODE.ATTENUATED : (options.sizeMode || PNTS_SIZE_MODE.VALUE);
        const minAttenuatedSize = options.minAttenuatedSize || 3;
        const maxAttenuatedSize = options.maxAttenuatedSize || 10;

        delete options.orientedImageMaterial;
        delete options.intensityRange;
        delete options.elevationRange;
        delete options.classification;
        delete options.applyOpacityClassication;
        delete options.size;
        delete options.mode;
        delete options.shape;
        delete options.sizeMode;
        delete options.minAttenuatedSize;
        delete options.maxAttenuatedSize;

        super(options);

        this.vertexShader = PointsVS;

        const scale = options.scale || 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale

        CommonMaterial.setDefineMapping(this, 'PNTS_MODE', PNTS_MODE);
        CommonMaterial.setDefineMapping(this, 'PNTS_SHAPE', PNTS_SHAPE);
        CommonMaterial.setDefineMapping(this, 'PNTS_SIZE_MODE', PNTS_SIZE_MODE);

        CommonMaterial.setUniformProperty(this, 'size', size);
        CommonMaterial.setUniformProperty(this, 'mode', mode);
        CommonMaterial.setUniformProperty(this, 'shape', shape);
        CommonMaterial.setUniformProperty(this, 'picking', false);
        CommonMaterial.setUniformProperty(this, 'opacity', this.opacity);
        CommonMaterial.setUniformProperty(this, 'overlayColor', options.overlayColor || new THREE.Vector4(0, 0, 0, 0));
        CommonMaterial.setUniformProperty(this, 'intensityRange', intensityRange);
        CommonMaterial.setUniformProperty(this, 'elevationRange', elevationRange);
        CommonMaterial.setUniformProperty(this, 'applyOpacityClassication', applyOpacityClassication);
        CommonMaterial.setUniformProperty(this, 'sizeMode', sizeMode);
        CommonMaterial.setUniformProperty(this, 'scale', scale);
        CommonMaterial.setUniformProperty(this, 'minAttenuatedSize', minAttenuatedSize);
        CommonMaterial.setUniformProperty(this, 'maxAttenuatedSize', maxAttenuatedSize);

        // add classification texture to apply classification lut.
        const classData = new Uint8Array(256 * 4);
        const classTexture = new THREE.DataTexture(classData, 256, 1, THREE.RGBAFormat);
        classTexture.needsUpdate = true;
        classTexture.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'classificationLUT', classTexture);

        // Classification scheme
        this.classification = classification;

        // Update classification
        this.recomputeClassification();

        // TODO
        const gradientCanvas = document.createElement('canvas');
        gradientCanvas.width = 256;
        gradientCanvas.height = 1;
        const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
        CommonMaterial.setUniformProperty(this, 'gradient', gradientTexture);

        this.recomputeGradient();

        if (oiMaterial) {
            this.uniforms.projectiveTextureAlphaBorder = oiMaterial.uniforms.projectiveTextureAlphaBorder;
            this.uniforms.projectiveTextureDistortion = oiMaterial.uniforms.projectiveTextureDistortion;
            this.uniforms.projectiveTextureMatrix = oiMaterial.uniforms.projectiveTextureMatrix;
            this.uniforms.projectiveTexture = oiMaterial.uniforms.projectiveTexture;
            this.uniforms.mask = oiMaterial.uniforms.mask;
            this.uniforms.boostLight = oiMaterial.uniforms.boostLight;
            this.defines.ORIENTED_IMAGES_COUNT = oiMaterial.defines.ORIENTED_IMAGES_COUNT;
            this.defines.USE_DISTORTION = oiMaterial.defines.USE_DISTORTION;
            this.defines.DEBUG_ALPHA_BORDER = oiMaterial.defines.DEBUG_ALPHA_BORDER;
            this.defines.USE_TEXTURES_PROJECTIVE = true;
            this.defines.USE_BASE_MATERIAL = true;
            this.fragmentShader = ShaderUtils.unrollLoops(PointsFS, this.defines);
        } else {
            this.fragmentShader = PointsFS;
        }

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
    }

    recomputeClassification() {
        const classification = this.classification;
        const data = this.classificationLUT.image.data;
        const width = this.classificationLUT.image.width;

        for (let i = 0; i < width; i++) {
            let color;
            let opacity;
            let visible = true;

            if (classification[i]) {
                color = classification[i].color;
                visible = classification[i].visible;
                opacity = classification[i].opacity;
            } else if (classification[i % 32]) {
                color = classification[i % 32].color;
                visible = classification[i % 32].visible;
                opacity = classification[i % 32].opacity;
            } else if (classification.DEFAULT) {
                color = classification.DEFAULT.color;
                visible = classification.DEFAULT.visible;
                opacity = classification.DEFAULT.opacity;
            } else {
                color = white;
                opacity = 1.0;
            }

            const j = 4 * i;
            data[j + 0] = parseInt(255 * color.r, 10);
            data[j + 1] = parseInt(255 * color.g, 10);
            data[j + 2] = parseInt(255 * color.b, 10);
            data[j + 3] = visible ? parseInt(255 * opacity, 10) : 0;
        }

        this.classificationLUT.needsUpdate = true;

        this.dispatchEvent({
            type: 'material_property_changed',
            target: this,
        });
    }

    recomputeGradient() {
        const width = this.gradient.source.data.width;
        const context = this.gradient.source.data.getContext('2d');

        context.rect(0, 0, width, 1);
        const gradient = context.createLinearGradient(0, 0, width, 1);
        const scheme = viridis;
        const length = scheme.length;
        for (let i = 0; i < length; ++i) {
            gradient.addColorStop(i / length, scheme[i]);
        }

        context.fillStyle = gradient;
        context.fill();

        this.gradient.needsUpdate = true;

        this.dispatchEvent({
            type: 'material_property_changed',
            target: this,
        });
    }


    onBeforeCompile(shader, renderer) {
        if (renderer.capabilities.isWebGL2) {
            this.defines.WEBGL2 = true;
            shader.glslVersion = '300 es';
        }
    }

    copy(source) {
        super.copy(source);
        if (source.uniforms.projectiveTextureAlphaBorder) {
            // Don't copy oriented image because, it's a link to oriented image material.
            // It needs a reference to oriented image material.
            this.uniforms.projectiveTextureAlphaBorder = source.uniforms.projectiveTextureAlphaBorder;
            this.uniforms.projectiveTextureDistortion = source.uniforms.projectiveTextureDistortion;
            this.uniforms.projectiveTextureMatrix = source.uniforms.projectiveTextureMatrix;
            this.uniforms.projectiveTexture = source.uniforms.projectiveTexture;
            this.uniforms.mask = source.uniforms.mask;
            this.uniforms.boostLight = source.uniforms.boostLight;
        }
        return this;
    }

    enablePicking(picking) {
        this.picking = picking;
        this.blending = picking ? THREE.NoBlending : THREE.NormalBlending;
    }

    update(source) {
        this.visible = source.visible;
        this.opacity = source.opacity;
        this.transparent = source.transparent;
        this.size = source.size;
        this.mode = source.mode;
        this.shape = source.shape;
        this.sizeMode = source.sizeMode;
        this.minAttenuatedSize = source.minAttenuatedSize;
        this.maxAttenuatedSize = source.maxAttenuatedSize;
        this.picking = source.picking;
        this.scale = source.scale;
        this.overlayColor.copy(source.overlayColor);
        this.intensityRange.copy(source.intensityRange);
        Object.assign(this.defines, source.defines);
        return this;
    }
}

export default PointsMaterial;
