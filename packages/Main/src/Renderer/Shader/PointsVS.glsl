#include <common>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec4 vColor; // color_pars_vertex

#ifdef USE_POINTS_UV
    varying vec2 vUv;
    uniform mat3 uvTransform;
#endif

#define SOURCE_ID_GROUP 8.

uniform float size;
uniform float scale;

uniform bool picking;
uniform int mode;

uniform vec2 elevationRange;
uniform vec2 intensityRange;
uniform vec2 angleRange;

uniform sampler2D classificationTexture;
uniform sampler2D discreteTexture;
uniform sampler2D gradientTexture;
uniform sampler2D visibilityTexture;

uniform int sizeMode;
uniform float minAttenuatedSize;
uniform float maxAttenuatedSize;

// Adaptive point size uniforms
uniform sampler2D visibleNodes;
uniform float octreeSpacing;
uniform float octreeSize;
uniform float nodeDepth;
uniform float nodeStartOffset;

attribute vec4 unique_id;
attribute float intensity;
attribute float classification;
attribute float pointSourceID;

attribute float returnNumber;
attribute float numberOfReturns;
attribute float scanAngle;

// Adaptive point size calculation functions (from Potree)
int numberOfOnes(int number, int index) {
    int numOnes = 0;
    int tmp = 128;
    for (int i = 7; i >= 0; i--) {
        if (number >= tmp) {
            number = number - tmp;
            if (i <= index) {
                numOnes++;
            }
        }
        tmp = tmp / 2;
    }
    return numOnes;
}

float getLOD() {
    vec3 offset = vec3(0.0, 0.0, 0.0);
    int iOffset = int(nodeStartOffset);
    float depth = nodeDepth;
    for (float i = 0.0; i <= 30.0; i++) {
        float nodeSizeAtLevel = octreeSize / pow(2.0, i + nodeDepth);

        vec3 index3d = (position-offset) / nodeSizeAtLevel;
        index3d = floor(index3d + 0.5);
        int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));

        vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
        int mask = int(round(value.r * 255.0));
        bool isBitSet = ((mask >> index) & 1) != 0;

        if (isBitSet) {
            int advanceGreen = int(round(value.g * 255.0)) * 256;
            int advanceChild = numberOfOnes(mask, index - 1);
            int advance = advanceGreen + advanceChild;
            iOffset = iOffset + advance;
            depth++;
        } else {
            float lodOffset = (255.0 * value.a) / 10.0 - 10.0;
            return depth + lodOffset;
        }
        offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
    }
    return depth;
}

void main() {
    vec2 uv = vec2(classification/255., 0.5);

    vColor = vec4(1.0);
    if (picking) {
        vColor = unique_id;
    } else {
        if (mode == PNTS_MODE_CLASSIFICATION) {
            vColor = texture2D(classificationTexture, uv);
        } else if (mode == PNTS_MODE_NORMAL) {
            vColor.rgb = abs(normal);
        } else if (mode == PNTS_MODE_COLOR) {
#if defined(USE_COLOR)
            vColor.rgb = color.rgb;
#elif defined(USE_COLOR_ALPHA)
            vColor = color;
#endif
        } else if (mode == PNTS_MODE_RETURN_NUMBER) {
            vec2 uv = vec2(returnNumber/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_RETURN_TYPE) {
            float returnType;
            if (returnNumber > numberOfReturns) {
                returnType = 4.;
            } else if (returnNumber == 1.) {
                if (numberOfReturns == 1.) {
                    // single
                    returnType = 0.;
                } else {
                    // first
                    returnType = 1.;
                }
            } else {
                if (returnNumber == numberOfReturns) {
                    // last
                    returnType = 3.;
                } else {
                    // intermediate
                    returnType = 2.;
                }
            }
            vec2 uv = vec2(returnType/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_RETURN_COUNT) {
            vec2 uv = vec2(numberOfReturns/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_POINT_SOURCE_ID) {
            vec2 uv = vec2(mod(pointSourceID, SOURCE_ID_GROUP)/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_SCAN_ANGLE) {
            float i = (scanAngle - angleRange.x) / (angleRange.y - angleRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        } else if (mode == PNTS_MODE_INTENSITY) {
            float i = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        } else if (mode == PNTS_MODE_ELEVATION) {
            float z = vec4(position, 1.0).z;
            float i = (z - elevationRange.x) / (elevationRange.y - elevationRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        }
    }

    if (texture2D(visibilityTexture, uv).r == 0.) {
        vColor.a = 0.;
    }

#define USE_COLOR_ALPHA
#include <morphcolor_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <project_vertex>

    gl_PointSize = size;

    if (sizeMode == PNTS_SIZE_MODE_ATTENUATED) {
        bool isPerspective = isPerspectiveMatrix(projectionMatrix);

        if (isPerspective) {
            gl_PointSize *= scale / -mvPosition.z;
            gl_PointSize = clamp(gl_PointSize, minAttenuatedSize, maxAttenuatedSize);
        }
    } else if (sizeMode == PNTS_SIZE_MODE_ADAPTIVE) {
        bool isPerspective = isPerspectiveMatrix(projectionMatrix);

        float r = octreeSpacing * 1.7;
        float pointSizeAttenuation = pow(2.0, getLOD());
        float worldSpaceSize = 1.0 * size * r / pointSizeAttenuation;

        if (isPerspective) {
            float projFactor = scale / -mvPosition.z;
            gl_PointSize = worldSpaceSize * projFactor;
        } else {
            // gl_PointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
        }
    }

#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
#include <worldpos_vertex>
#include <fog_vertex>
}
