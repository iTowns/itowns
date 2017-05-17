// default values
let logDepthBufferSupported = false;
let maxTexturesUnits = 8;
let maxTextureSize;

export default {
    isLogDepthBufferSupported() {
        return logDepthBufferSupported;
    },
    isInternetExplorer() {
        const internetExplorer = false || !!document.documentMode;
        return internetExplorer;
    },
    getMaxTextureUnitsCount() {
        return maxTexturesUnits;
    },
    getMaxTextureSize() {
        return maxTextureSize;
    },
    updateCapabilities(renderer) {
        const gl = renderer.context;
        maxTexturesUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        maxTextureSize = renderer.capabilities.maxTextureSize;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo !== null) {
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            if (vendor.indexOf('mesa') > -1 || vendor.indexOf('Mesa') > -1) {
                maxTexturesUnits = Math.min(16, maxTexturesUnits);
            }
        } else {
            maxTexturesUnits = Math.min(16, maxTexturesUnits);
        }

        logDepthBufferSupported = renderer.capabilities.logarithmicDepthBuffer;
    },
};
