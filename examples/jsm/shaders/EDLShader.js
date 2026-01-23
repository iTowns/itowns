import {
    Vector2,
} from 'three';

const vertexShader = /* glsl */ `
out vec2 vUv;

void main() {
    vUv = uv;
#include <begin_vertex>
#include <project_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <packing>

#ifdef USE_REVERSED_DEPTH_BUFFER
#define DEPTH_THRESHOLD 0.0
#else
#define DEPTH_THRESHOLD 1.0
#endif

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;

uniform vec2 kernel[KERNEL_SIZE];

uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;

uniform float kernelRadius;
uniform float edlStrength;

in vec2 vUv;

float getDepth(const in vec2 screenPosition) {
    return texture2D(tDepth, screenPosition).x;
}

float getLinearDepth(const in vec2 screenPosition) {
    #if PERSPECTIVE_CAMERA == 1
        float fragCoordZ = texture2D(tDepth, screenPosition).x;
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
        return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
    #else
        return texture2D(tDepth, screenPosition).x;
    #endif
}

float getLogDepth(const in vec2 screenPosition) {
    float linear = getLinearDepth(screenPosition);
    return log2(max(linear, 0.0000001));
}

void main() {
    float depth = getDepth(vUv);
    vec4 color = texture2D(tDiffuse, vUv);

    if (depth == DEPTH_THRESHOLD) {
        discard;
    }

    float logDepth = getLogDepth(vUv);
    vec2 uvRadius = kernelRadius / resolution;

    float edl = 0.0;
    for (int i = 0; i < KERNEL_SIZE; ++i) {
        vec2 uvNeighbour = clamp(vUv + uvRadius * kernel[i], 0.0, 1.0);
        edl = edl + max(0.0, logDepth - getLogDepth(uvNeighbour));
    }
    edl = edl / float(KERNEL_SIZE);

    edl = exp(-edl * 300.0 * edlStrength);

    gl_FragColor = vec4(color.rgb * edl, color.a);
    gl_FragDepth = depth;
}

`;

const EDLShader = {
    name: 'EDLShader',

    defines: {
        KERNEL_SIZE: 8,
        PERSPECTIVE_CAMERA: 1,
    },

    uniforms: {
        tDepth: { value: null },
        tDiffuse: { value: null },
        kernel: { value: null },
        resolution: { value: new Vector2() },
        cameraNear: { value: null },
        cameraFar: { value: null },
        kernelRadius: { value: 1.5 },
        edlStrength: { value: 0.7 },
    },

    vertexShader,
    fragmentShader,
};

export { EDLShader };
