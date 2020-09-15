import * as THREE from 'three';
import PointsVS from 'Renderer/Shader/PointsVS.glsl';
import PointsFS from 'Renderer/Shader/PointsFS.glsl';
import Capabilities from 'Core/System/Capabilities';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import CommonMaterial from 'Renderer/CommonMaterial';

export const MODE = {
    COLOR: 0,
    INTENSITY: 1,
    CLASSIFICATION: 2,
    NORMAL: 3,
};

class PointsMaterial extends THREE.RawShaderMaterial {
    constructor(options = {}) {
        const oiMaterial = options.orientedImageMaterial;
        delete options.orientedImageMaterial;
        super(options);
        this.vertexShader = PointsVS;

        this.scale = options.scale || 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale

        CommonMaterial.setDefineMapping(this, 'MODE', MODE);

        CommonMaterial.setUniformProperty(this, 'size', options.size || 0);
        CommonMaterial.setUniformProperty(this, 'mode', options.mode || MODE.COLOR);
        CommonMaterial.setUniformProperty(this, 'picking', false);
        CommonMaterial.setUniformProperty(this, 'opacity', this.opacity);
        CommonMaterial.setUniformProperty(this, 'overlayColor', options.overlayColor || new THREE.Vector4(0, 0, 0, 0));


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
        this.picking = source.picking;
        this.scale = source.scale;
        this.overlayColor.copy(source.overlayColor);
        Object.assign(this.defines, source.defines);
        return this;
    }
}

export default PointsMaterial;
