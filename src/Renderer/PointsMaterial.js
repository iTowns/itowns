import { Vector4, Uniform, NoBlending, NormalBlending, RawShaderMaterial } from 'three';
import PointsVS from './Shader/PointsVS.glsl';
import PointsFS from './Shader/PointsFS.glsl';
import Capabilities from '../Core/System/Capabilities';

class PointsMaterial extends RawShaderMaterial {
    constructor(parameters = {}) {
        super();
        this.vertexShader = PointsVS;
        this.fragmentShader = PointsFS;
        this.type = 'itowns.PointsMaterial';

        this.size = 0;
        this.scale = 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale
        this.overlayColor = new Vector4(0, 0, 0, 0);
        this.pickingMode = false;

        this.uniforms.size = new Uniform(this.size);
        this.uniforms.pickingMode = new Uniform(this.pickingMode);
        this.uniforms.opacity = new Uniform(this.opacity);
        this.uniforms.overlayColor = new Uniform(this.overlayColor);

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines = {
                USE_LOGDEPTHBUF: 1,
                USE_LOGDEPTHBUF_EXT: 1,
            };
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
        this.setValues(parameters);
        this.updateUniforms();
    }

    enablePicking(pickingMode) {
        // we don't want pixels to blend over already drawn pixels
        this.pickingMode = pickingMode;
        this.blending = pickingMode ? NoBlending : NormalBlending;
    }

    updateUniforms() {
        // if size is null, switch to autosizing using the canvas height
        this.uniforms.size.value = (this.size > 0) ? this.size : -this.scale * window.innerHeight;
        this.uniforms.opacity.value = this.opacity;
        this.uniforms.overlayColor.value.copy(this.overlayColor);
        this.uniforms.pickingMode.value = this.pickingMode;

        this.uniformsNeedUpdate = true;
    }

    copy(source) {
         // backup the uniforms
        const dst_uniforms = this.uniforms;
        const src_uniforms = source.uniforms;

        // copy overwrites this.uniforms with source.uniforms, using UniformUtils.clone
        // set source_uniforms to null to minimize useless work
        // this.uniforms is now {} (=== UniformUtils.clone(null))
        // a new UniformUtils.copy method could be used instead of this workaround
        source.uniforms = null;
        super.copy(source);

        // restore uniforms
        this.uniforms = dst_uniforms;
        source.uniforms = src_uniforms;

        this.size = source.size;
        this.scale = source.scale;
        this.overlayColor.copy(source.overlayColor);
        this.pickingMode = source.pickingMode;

        this.updateUniforms();
        return this;
    }

    setValues(values) {
        const overlayColor = this.overlayColor; // backup the Vector4
        super.setValues(values); // overwrites Vector4 values (instead of copying)
        this.overlayColor = overlayColor.copy(this.overlayColor); // restore and update
    }
}

export default PointsMaterial;
