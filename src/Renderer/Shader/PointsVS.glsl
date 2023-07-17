#include <itowns/WebGL2_pars_vertex>
#include <itowns/precision_qualifier>
#include <itowns/project_pars_vertex>
#if defined(USE_TEXTURES_PROJECTIVE)
#include <itowns/projective_texturing_pars_vertex>
#endif
#include <common>
#include <logdepthbuf_pars_vertex>

// For now, we only consider 3-bits uint values for return numbers.
// On LAS 1.4 PDRF >= 6, return numbers are encoded on 4 bits, so we clamp them
// to 3 bits.
#define RETURN_NUMBER_MAX 7.

attribute vec3 color;
attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute float gpsTime;

uniform mat4 modelMatrix;

uniform vec2 intensityRange;
uniform vec2 elevationRange;

uniform float size;
uniform float scale;

uniform bool picking;
uniform int mode;
uniform float opacity;
uniform vec4 overlayColor;
uniform bool applyOpacityClassication;
attribute vec4 unique_id;
uniform sampler2D classificationLUT;
uniform int sizeMode;
uniform float minAttenuatedSize;
uniform float maxAttenuatedSize;

#if defined(NORMAL_OCT16)
attribute vec2 oct16Normal;
#elif defined(NORMAL_SPHEREMAPPED)

attribute vec2 sphereMappedNormal;
#else
attribute vec3 normal;
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
        vColor.a = opacity;
        if (applyOpacityClassication || mode == PNTS_MODE_CLASSIFICATION) {
            vec2 uv = vec2(classification, 0.5);
            vColor = texture2D(classificationLUT, uv);
            vColor.a *= opacity;
        }

        if (mode == PNTS_MODE_INTENSITY) {
            // adapt the grayscale knowing the range
            float i = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
            vColor.rgb = vec3(i, i, i);
        } else if (mode == PNTS_MODE_NORMAL) {
            vColor.rgb = abs(normal);
        } else if (mode == PNTS_MODE_COLOR) {
            // default to color mode
            vColor.rgb = mix(color, overlayColor.rgb, overlayColor.a);
        } else if (mode == PNTS_MODE_RETURN_NUMBER) {
            float n = returnNumber / RETURN_NUMBER_MAX;
            vColor.rgb = vec3(n, n, n);
        } else if (mode == PNTS_MODE_NUMBER_OF_RETURNS) {
            float n = numberOfReturns / RETURN_NUMBER_MAX;
            vColor.rgb = vec3(n, n, n);
        } else if (mode == PNTS_MODE_POINT_SOURCE_ID) {
            // group ids by their 4 least significant bits
            float i = mod(pointSourceID, 16.) / 16.;
            vColor.rgb = vec3(i, i, i);
        } else if (mode == PNTS_MODE_ELEVATION) {
            // apply scale and offset transform
            vec4 model = modelMatrix * vec4(position, 1.0);
            float z = (model.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
            // adapt the grayscale knowing the range
            vColor.rgb = vec3(z, z, z);
        }
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
