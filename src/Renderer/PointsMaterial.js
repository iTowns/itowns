import * as THREE from 'three';
import PointsVS from 'Renderer/Shader/PointsVS.glsl';
import PointsFS from 'Renderer/Shader/PointsFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import CommonMaterial from 'Renderer/CommonMaterial';
import Gradients from 'Utils/Gradients';

export const PNTS_MODE = {
    COLOR: 0,
    INTENSITY: 1,
    CLASSIFICATION: 2,
    ELEVATION: 3,
    RETURN_NUMBER: 4,
    RETURN_TYPE: 5,
    RETURN_COUNT: 6,
    POINT_SOURCE_ID: 7,
    SCAN_ANGLE: 8,
    NORMAL: 9,
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
        DEFAULT: { visible: true, name: 'default', color: new THREE.Color(0.3, 0.6, 0.6), opacity: 1.0 },
    },
};

const DiscreteScheme = {
    DEFAULT: {
        0: { visible: true, name: '0', color: new THREE.Color('rgb(67, 99, 216)'), opacity: 1.0 },
        1: { visible: true, name: '1', color: new THREE.Color('rgb(60, 180, 75);'), opacity: 1.0 },
        2: { visible: true, name: '2', color: new THREE.Color('rgb(255, 255, 25)'), opacity: 1.0 },
        3: { visible: true, name: '3', color: new THREE.Color('rgb(145, 30, 180)'), opacity: 1.0 },
        4: { visible: true, name: '4', color: new THREE.Color('rgb(245, 130, 49)'), opacity: 1.0 },
        5: { visible: true, name: '5', color: new THREE.Color('rgb(230, 25, 75)'), opacity: 1.0 },
        6: { visible: true, name: '6', color: new THREE.Color('rgb(66, 212, 244)'), opacity: 1.0 },
        7: { visible: true, name: '7', color: new THREE.Color('rgb(240, 50, 230)'), opacity: 1.0 },
        DEFAULT: { visible: true, name: 'default', color: white, opacity: 1.0 },
    },
};

// Taken from Potree. Copyright (c) 2011-2020, Markus Schütz All rights reserved.
// https://github.com/potree/potree/blob/develop/src/materials/PointCloudMaterial.js
function generateGradientTexture(gradient) {
    const size = 64;

    // create canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    // get context
    const context = canvas.getContext('2d');

    // draw gradient
    context.rect(0, 0, size, size);
    const ctxGradient = context.createLinearGradient(0, 0, size, size);

    for (let i = 0; i < gradient.length; i++) {
        const step = gradient[i];

        ctxGradient.addColorStop(step[0], `#${step[1].getHexString()}`);
    }

    context.fillStyle = ctxGradient;
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    texture.minFilter = THREE.LinearFilter;
    texture.wrap = THREE.RepeatWrapping;
    texture.repeat = 2;

    return texture;
}

function recomputeTexture(scheme, texture, nbClass) {
    let needTransparency;
    const data = texture.image.data;
    const width = texture.image.width;
    if (!nbClass) { nbClass = Object.keys(scheme).length; }

    for (let i = 0; i < width; i++) {
        let color;
        let opacity;
        let visible = true;

        if (scheme[i]) {
            color = scheme[i].color;
            visible = scheme[i].visible;
            opacity = scheme[i].opacity;
        } else if (scheme[i % nbClass]) {
            color = scheme[i % nbClass].color;
            visible = scheme[i % nbClass].visible;
            opacity = scheme[i % nbClass].opacity;
        } else if (scheme.DEFAULT) {
            color = scheme.DEFAULT.color;
            visible = scheme.DEFAULT.visible;
            opacity = scheme.DEFAULT.opacity;
        } else {
            color = white;
            opacity = 1.0;
        }

        const j = 4 * i;
        data[j + 0] = parseInt(255 * color.r, 10);
        data[j + 1] = parseInt(255 * color.g, 10);
        data[j + 2] = parseInt(255 * color.b, 10);
        data[j + 3] = visible ? parseInt(255 * opacity, 10) : 0;

        needTransparency = needTransparency || opacity < 1;
    }
    texture.needsUpdate = true;
    return needTransparency;
}

class PointsMaterial extends THREE.ShaderMaterial {
    /**
     * @class      PointsMaterial
     * @param      {object}  [options={}]  The options
     * @param      {number}  [options.size=0]  size point
     * @param      {number}  [options.mode=PNTS_MODE.COLOR]  display mode.
     * @param      {number}  [options.mode=PNTS_SHAPE.CIRCLE]  rendered points shape.
     * @param      {THREE.Vector4}  [options.overlayColor=new THREE.Vector4(0, 0, 0, 0)]  overlay color.
     * @param      {THREE.Vector2}  [options.intensityRange=new THREE.Vector2(1, 65536)]  intensity range.
     * @param      {THREE.Vector2}  [options.elevationRange=new THREE.Vector2(0, 1000)]  elevation range.
     * @param      {THREE.Vector2}  [options.angleRange=new THREE.Vector2(-90, 90)]  scan angle range.
     * @param      {Scheme}  [options.classification]  LUT for point classification colorization.
     * @param      {Scheme}  [options.discreteScheme]  LUT for other discret point values colorization.
     * @param      {string}  [options.gradient]  Descrition of the gradient to use for continuous point values.
     *                          (Default value will be the 'SPECTRAL' gradient from Utils/Gradients)
     * @param      {number}  [options.sizeMode=PNTS_SIZE_MODE.VALUE]  point cloud size mode. Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance from point to camera.
     * @param      {number}  [options.minAttenuatedSize=3]  minimum scale used by 'ATTENUATED' size mode
     * @param      {number}  [options.maxAttenuatedSize=10]  maximum scale used by 'ATTENUATED' size mode
     *
     * @property {Scheme}  classificationScheme - Color scheme for point classification values.
     * @property {Scheme}  discreteScheme - Color scheme for all other discrete values.
     * @property {object}  gradients - Descriptions of all available gradients.
     * @property {object}  gradient - Description of the gradient to use for display.
     * @property {THREE.CanvasTexture}  gradientTexture - The texture generate from the choosen gradient.
     *
     * @example
     * // change color category classification
     * const pointMaterial = new PointsMaterial();
     * pointMaterial.classification[3].color.setStyle('red');
     * pointMaterial.recomputeClassification();
     */
    constructor(options = {}) {
        const intensityRange = options.intensityRange || new THREE.Vector2(1, 65536);
        const elevationRange = options.elevationRange || new THREE.Vector2(0, 1000);
        const angleRange = options.angleRange || new THREE.Vector2(-90, 90);
        const oiMaterial = options.orientedImageMaterial;
        const classificationScheme = options.classification || ClassificationScheme.DEFAULT;
        const discreteScheme = options.discreteScheme || DiscreteScheme.DEFAULT;
        const size = options.size || 0;
        const mode = options.mode || PNTS_MODE.COLOR;
        const shape = options.shape || PNTS_SHAPE.CIRCLE;
        const sizeMode = size === 0 ? PNTS_SIZE_MODE.ATTENUATED : (options.sizeMode || PNTS_SIZE_MODE.VALUE);
        const minAttenuatedSize = options.minAttenuatedSize || 3;
        const maxAttenuatedSize = options.maxAttenuatedSize || 10;
        let gradients = Gradients;
        if (options.gradient) {
            gradients = {
                ...options.gradient,
                ...Gradients,
            };
        }

        delete options.intensityRange;
        delete options.elevationRange;
        delete options.angleRange;
        delete options.orientedImageMaterial;
        delete options.classification;
        delete options.discreteScheme;
        delete options.size;
        delete options.mode;
        delete options.shape;
        delete options.sizeMode;
        delete options.minAttenuatedSize;
        delete options.maxAttenuatedSize;
        delete options.gradient;

        super(options);
        this.userData.needTransparency = {};
        this.gradients = gradients;
        this.gradientTexture = new THREE.CanvasTexture();

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
        CommonMaterial.setUniformProperty(this, 'angleRange', angleRange);
        CommonMaterial.setUniformProperty(this, 'sizeMode', sizeMode);
        CommonMaterial.setUniformProperty(this, 'scale', scale);
        CommonMaterial.setUniformProperty(this, 'minAttenuatedSize', minAttenuatedSize);
        CommonMaterial.setUniformProperty(this, 'maxAttenuatedSize', maxAttenuatedSize);

        // add classification texture to apply classification lut.
        const data = new Uint8Array(256 * 4);
        const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'classificationTexture', texture);

        // add texture to applying the discrete lut.
        const dataLUT = new Uint8Array(256 * 4);
        const textureLUT = new THREE.DataTexture(dataLUT, 256, 1, THREE.RGBAFormat);
        textureLUT.needsUpdate = true;
        textureLUT.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'discreteTexture', textureLUT);

        // Classification and other discrete values scheme
        this.classificationScheme = classificationScheme;
        this.discreteScheme = discreteScheme;

        // Update classification and discrete Texture
        this.recomputeClassification();
        this.recomputeDiscreteTexture();

        // Gradient texture for continuous values
        this.gradient = Object.values(gradients)[0];
        CommonMaterial.setUniformProperty(this, 'gradientTexture', this.gradientTexture);

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
            // three loop unrolling of ShaderMaterial only supports integer
            // bounds, see https://github.com/mrdoob/three.js/issues/28020
            this.fragmentShader = ShaderUtils.unrollLoops(PointsFS, this.defines);
        } else {
            this.fragmentShader = PointsFS;
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
    }

    recomputeClassification() {
        const needTransparency = recomputeTexture(this.classificationScheme, this.classificationTexture, 32);
        this.userData.needTransparency[PNTS_MODE.CLASSIFICATION] = needTransparency;
        this.dispatchEvent({
            type: 'material_property_changed',
            target: this.uniforms,
        });
    }

    recomputeDiscreteTexture() {
        const needTransparency = recomputeTexture(this.discreteScheme, this.discreteTexture);
        this.userData.needTransparency[PNTS_MODE.RETURN_NUMBER] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.RETURN_TYPE] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.RETURN_COUNT] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.POINT_SOURCE_ID] = needTransparency;
        this.dispatchEvent({
            type: 'material_property_changed',
            target: this.uniforms,
        });
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
        this.elevationRange.copy(source.elevationRange);
        this.angleRange.copy(source.angleRange);
        Object.assign(this.defines, source.defines);
        return this;
    }

    set gradient(value) {
        this.gradientTexture = generateGradientTexture(value);
    }
}

export default PointsMaterial;
