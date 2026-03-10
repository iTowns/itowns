import {
    NoBlending,
    ShaderMaterial,
    Vector2,
} from 'three';

// Algorithm by Christian Boucheny. See:
// - Phd thesis (page 115-127, french):
//   https://tel.archives-ouvertes.fr/tel-00438464/document
// - Implementation in Cloud Compare (last update 2022):
//   https://github.com/CloudCompare/CloudCompare/tree/master/plugins/core/GL/qEDL/shaders/EDL
// Parameters by Markus Schuetz (Potree). See:
// - Master thesis (pages 38-41):
//   https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
// - Implementation in Potree (last update 2019):
//   https://github.com/potree/potree/blob/develop/src/materials/shaders/edl.fs


// This is the vertex shader used by CopyMaterial for pmndrs/postprocessing.
const vertexShader = /* glsl */`
out vec2 vUv;
void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
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
        gl_FragColor = color;
        gl_FragDepth = depth;
        return;
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

/**
 * Generates a kernel of evenly distributed 2D sample directions around a
 * circle.
 * Used for sampling neighbor depths in the EDL algorithm.
 */
function generateKernel(kernelSize: number): Float32Array {
    const kernel = new Float32Array(kernelSize * 2);

    for (let i = 0; i < kernelSize; ++i) {
        const angle = (2 * Math.PI * i) / kernelSize;
        kernel[(i * 2) + 0] = Math.cos(angle);
        kernel[(i * 2) + 1] = Math.sin(angle);
    }

    return kernel;
}

const MakeEDLShader = (
    kernelSize:number,
    width: number,
    height: number,
) => new ShaderMaterial({
    name: 'EDLShader',

    defines: {
        KERNEL_SIZE: kernelSize,
        PERSPECTIVE_CAMERA: 1,
    },

    uniforms: {
        tDepth: { value: null },
        tDiffuse: { value: null },
        kernel: { value: generateKernel(kernelSize) },
        resolution: { value: new Vector2(width, height) },
        cameraNear: { value: null },
        cameraFar: { value: null },
        kernelRadius: { value: 1.5 },
        edlStrength: { value: 0.7 },
    },

    vertexShader,
    fragmentShader,

    blending: NoBlending,
    toneMapped: false,
    depthWrite: false,
    depthTest: false,
});

export { MakeEDLShader };
