#include <itowns/precision_qualifier>
#if defined(USE_TEXTURES_PROJECTIVE)
#include <itowns/projective_texturing_pars_vertex>
#endif
#include <common>
#include <logdepthbuf_pars_vertex>

#define NB_CLASS 8.

uniform float size;
uniform float scale;

uniform bool picking;
uniform int mode;
uniform float opacity;
uniform vec4 overlayColor;

uniform vec2 elevationRange;
uniform vec2 intensityRange;
uniform vec2 angleRange;

uniform sampler2D classificationTexture;
uniform sampler2D discreteTexture;
uniform sampler2D gradientTexture;
uniform int sizeMode;
uniform float minAttenuatedSize;
uniform float maxAttenuatedSize;

attribute vec3 color;
attribute vec2 range;
attribute vec4 unique_id;
attribute float intensity;
attribute float classification;
attribute float pointSourceID;

attribute float returnNumber;
attribute float numberOfReturns;
attribute float scanAngle;

varying vec4 vColor;

void main() {

    if (picking) {
        vColor = unique_id;
    } else {
        vColor.a = 1.0;
        if (mode == PNTS_MODE_CLASSIFICATION) {
            vec2 uv = vec2(classification/255., 0.5);
            vColor = texture2D(classificationTexture, uv);
        } else if (mode == PNTS_MODE_NORMAL) {
            vColor.rgb = abs(normal);
        } else if (mode == PNTS_MODE_COLOR) {
            // default to color mode
            vColor.rgb = mix(color, overlayColor.rgb, overlayColor.a);
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
            vec2 uv = vec2(mod(pointSourceID, NB_CLASS)/255., 0.5);
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
            float z = (modelMatrix * vec4(position, 1.0)).z;
            float i = (z - elevationRange.x) / (elevationRange.y - elevationRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        }

        vColor.a *= opacity;
    }

    #include <begin_vertex>
    #include <project_vertex>

    gl_PointSize = size;

    if (sizeMode == PNTS_SIZE_MODE_ATTENUATED) {
        bool isPerspective = isPerspectiveMatrix(projectionMatrix);

        if (isPerspective) {
            gl_PointSize *= scale / -mvPosition.z;
            gl_PointSize = clamp(gl_PointSize, minAttenuatedSize, maxAttenuatedSize);
        }
    }

#if defined(USE_TEXTURES_PROJECTIVE)
    #include <itowns/projective_texturing_vertex>
#endif
    #include <logdepthbuf_vertex>
}
