import { Vector4, Uniform, NoBlending, NormalBlending, RawShaderMaterial } from 'three';
import PointsVS from './Shader/PointsVS.glsl';
import PointsFS from './Shader/PointsFS.glsl';
import Capabilities from '../Core/System/Capabilities';

export const MODE = {
    COLOR: 0,
    PICKING: 1,
    INTENSITY: 2,
    CLASSIFICATION: 3,
    NORMAL: 4,
};

class PointsMaterial extends RawShaderMaterial {
    constructor(options = {}) {
        super(options);
        this.vertexShader = PointsVS;
        this.fragmentShader = PointsFS;

        this.size = options.size || 0;
        this.scale = options.scale || 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale
        this.overlayColor = options.overlayColor || new Vector4(0, 0, 0, 0);
        this.mode = options.mode || MODE.COLOR;
        this.oldMode = null;

        for (const key in MODE) {
            if (Object.prototype.hasOwnProperty.call(MODE, key)) {
                this.defines[`MODE_${key}`] = MODE[key];
            }
        }

        this.uniforms.size = new Uniform(this.size);
        this.uniforms.mode = new Uniform(this.mode);
        this.uniforms.pickingMode = new Uniform(false);
        this.uniforms.opacity = new Uniform(this.opacity);
        this.uniforms.overlayColor = new Uniform(this.overlayColor);

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
        this.updateUniforms();
    }

    enablePicking(pickingMode) {
        // we don't want pixels to blend over already drawn pixels
        this.blending = pickingMode ? NoBlending : NormalBlending;
        if (pickingMode) {
            if (this.uniforms.mode.value !== MODE.PICKING) {
                this.oldMode = this.uniforms.mode.value;
                this.uniforms.mode.value = MODE.PICKING;
            }
        } else {
            this.uniforms.mode.value = this.oldMode || this.uniforms.mode.value;
            this.oldMode = null;
        }
    }

    updateUniforms() {
        // if size is null, switch to autosizing using the canvas height
        this.uniforms.size.value = (this.size > 0) ? this.size : -this.scale * window.innerHeight;
        this.uniforms.mode.value = this.mode || MODE.COLOR;
        this.uniforms.opacity.value = this.opacity;
        this.uniforms.overlayColor.value = this.overlayColor;
    }

    copy(source) {
        this.visible = source.visible;
        this.opacity = source.opacity;
        this.transparent = source.transparent;
        this.size = source.size;
        this.mode = source.mode;
        this.scale = source.scale;
        this.overlayColor.copy(source.overlayColor);
        this.updateUniforms();
        Object.assign(this.defines, source.defines);
        return this;
    }
}

export default PointsMaterial;
