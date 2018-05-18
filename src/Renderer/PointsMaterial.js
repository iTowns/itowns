import { Vector4, Uniform, NoBlending, NormalBlending, RawShaderMaterial } from 'three';
import PointsVS from './Shader/PointsVS.glsl';
import PointsFS from './Shader/PointsFS.glsl';
import Capabilities from '../Core/System/Capabilities';

class PointsMaterial extends RawShaderMaterial {
    constructor(size = 0) {
        super();
        this.vertexShader = PointsVS;
        this.fragmentShader = PointsFS;
        this.size = size || 0;
        this.scale = 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale

        this.uniforms.size = new Uniform(this.size);
        this.uniforms.pickingMode = new Uniform(false);
        this.uniforms.opacity = new Uniform(1.0);
        this.uniforms.overlayColor = new Uniform(new Vector4(0, 0, 0, 0));

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines = {
                USE_LOGDEPTHBUF: 1,
                USE_LOGDEPTHBUF_EXT: 1,
            };
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }

        this.updateUniforms();
    }

    enablePicking(pickingMode) {
        // we don't want pixels to blend over already drawn pixels
        this.blending = pickingMode ? NoBlending : NormalBlending;
        this.uniforms.pickingMode.value = pickingMode;
    }

    updateUniforms() {
        // if size is null, switch to autosizing using the canvas height
        this.uniforms.size.value = (this.size > 0) ? this.size : -this.scale * window.innerHeight;
    }
}

export default PointsMaterial;
