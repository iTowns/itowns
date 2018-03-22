import SampleTestFS from '../../Renderer/Shader/SampleTestFS.glsl';
import SampleTestVS from '../../Renderer/Shader/SampleTestVS.glsl';

// default values
let logDepthBufferSupported = false;
let maxTexturesUnits = 8;

function _WebGLShader(renderer, type, string) {
    const gl = renderer.context;
    const shader = gl.createShader(type);

    gl.shaderSource(shader, string);
    gl.compileShader(shader);
    return shader;
}

function isFirefox() {
    return navigator && navigator.userAgent && navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

export default {
    isLogDepthBufferSupported() {
        return logDepthBufferSupported;
    },
    isFirefox,
    isInternetExplorer() {
        const internetExplorer = false || !!document.documentMode;
        return internetExplorer;
    },
    getMaxTextureUnitsCount() {
        return maxTexturesUnits;
    },
    updateCapabilities(renderer) {
        const gl = renderer.context;
        maxTexturesUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        const program = gl.createProgram();
        const glVertexShader = _WebGLShader(renderer, gl.VERTEX_SHADER, SampleTestVS);

        let fragmentShader = `#define SAMPLE ${maxTexturesUnits}\n`;
        fragmentShader += SampleTestFS;

        const glFragmentShader = _WebGLShader(renderer, gl.FRAGMENT_SHADER, fragmentShader);

        gl.attachShader(program, glVertexShader);
        gl.attachShader(program, glFragmentShader);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
            // eslint-disable-next-line no-console
            console.warn(`Sampler limit exceeded: it's down from ${maxTexturesUnits} to 16`);
            if (isFirefox()) {
                // eslint-disable-next-line no-console
                console.warn('it can come from a bug mesa/firefox \n\n' +
                    'Error compile shader when using more than 16 sampler uniforms\n\n' +
                    'https://bugzilla.mozilla.org/show_bug.cgi?id=777028');
            }
            maxTexturesUnits = Math.min(16, maxTexturesUnits);
        }

        gl.deleteProgram(program);
        gl.deleteShader(glVertexShader);
        gl.deleteShader(glFragmentShader);
        logDepthBufferSupported = renderer.capabilities.logarithmicDepthBuffer;
    },
};
