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

#if defined(NORMAL_OCT16)
attribute vec2 oct16Normal;
#elif defined(NORMAL_SPHEREMAPPED)
attribute vec2 sphereMappedNormal;
#endif

varying vec4 vColor;

// see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602
// and implementation in PotreeConverter (BINPointReader.cpp) and potree (BinaryDecoderWorker.js)
#if defined(NORMAL_OCT16)
vec3 decodeOct16Normal(vec2 encodedNormal) {
    vec2 nNorm = 2. * (encodedNormal / 255.) - 1.;
    vec3 n;
    n.z = 1. - abs(nNorm.x) - abs(nNorm.y);
    if (n.z >= 0.) {
        n.x = nNorm.x;
        n.y = nNorm.y;
    } else {
        n.x = sign(nNorm.x) - sign(nNorm.x) * sign(nNorm.y) * nNorm.y;
        n.y = sign(nNorm.y) - sign(nNorm.y) * sign(nNorm.x) * nNorm.x;
    }
    return normalize(n);
}
#elif defined(NORMAL_SPHEREMAPPED)
// see http://aras-p.info/texts/CompactNormalStorage.html method #4
// or see potree's implementation in BINPointReader.cpp
vec3 decodeSphereMappedNormal(vec2 encodedNormal) {
    vec2 fenc = 2. * encodedNormal / 255. - 1.;
    float f = dot(fenc,fenc);
    float g = 2. * sqrt(1. - f);
    vec3 n;
    n.xy = fenc * g;
    n.z = 1. - 2. * f;
    return n;
}
#endif

void main() {

#if defined(NORMAL_OCT16)
    vec3  normal = decodeOct16Normal(oct16Normal);
#elif defined(NORMAL_SPHEREMAPPED)
    vec3 normal = decodeSphereMappedNormal(sphereMappedNormal);
#elif defined(NORMAL)
    // nothing to do
#else
    // default to color
    vec3 normal = color;
#endif

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
