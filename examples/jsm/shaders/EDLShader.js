import {
    Vector2,
} from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
#include <begin_vertex>
#include <project_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <common>
#include <packing>

uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;

uniform vec2 kernel[KERNEL_SIZE];

in vec2 vUv;

float getLinearDepth(const in vec2 screenPosition) {
    // TODO: orthographic support
    float fragCoordZ = texture2D(tDepth, screenPosition).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

float shadow(float depth) {
    vec2 uvRadius = 1.0 / resolution;

    float sum = 0.0;

    vec2 uvNeighbour;
    float neighbourDepth;
    for (int i = 0; i < KERNEL_SIZE; ++i) {
        uvNeighbour = vUv + uvRadius * kernel[i];
        neighbourDepth = getLinearDepth(uvNeighbour);

        sum += max(0.0, depth - neighbourDepth);
    }

    return sum / float(KERNEL_SIZE);
}

void main() {
    float depth = getLinearDepth(vUv);
    float res = shadow(depth);

    float edl = exp(- 300.0 * res * 6000.);
    vec4 color = texture2D(tDiffuse, vUv);

    gl_FragColor = vec4(color.rgb * edl, color.a);
}

`;

const EDLShader = {
    name: 'EDLShader',

    defines: {
        KERNEL_SIZE: 8,
    },

    uniforms: {
        tDepth: { value: null },
        tDiffuse: { value: null },
        kernel: { value: null },
        cameraNear: { value: null },
        cameraFar: { value: null },
        resolution: { value: new Vector2() },
    },

    vertexShader,
    fragmentShader,
};

export { EDLShader };
