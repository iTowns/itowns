#include <itowns/WebGL2_pars_vertex>
#include <itowns/precision_qualifier>
#include <itowns/project_pars_vertex>
#if defined(USE_TEXTURES_PROJECTIVE)
#include <itowns/projective_texturing_pars_vertex>
#endif
#include <common>
#include <logdepthbuf_pars_vertex>

uniform float size;

uniform bool picking;
uniform int mode;
uniform float opacity;
uniform vec4 overlayColor;
uniform vec2 intensityRange;
uniform bool applyOpacityClassication;
attribute vec3 color;
attribute vec4 unique_id;
attribute float intensity;
attribute float classification;
uniform sampler2D classificationLUT;

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
        if (applyOpacityClassication || mode == MODE_CLASSIFICATION) {
            vec2 uv = vec2(classification, 0.5);
            vColor = texture2D(classificationLUT, uv);
            vColor.a *= opacity;
        }

        if (mode == MODE_INTENSITY) {
            // adapt the grayscale knowing the range
            float i = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
            vColor.rgb = vec3(i, i, i);
        } else if (mode == MODE_NORMAL) {
            vColor.rgb = abs(normal);
        } else if (mode == MODE_COLOR) {
            // default to color mode
            vColor.rgb = mix(color, overlayColor.rgb, overlayColor.a);
        }
    }

    #include <begin_vertex>
    #include <project_vertex>

    if (size > 0.) {
        gl_PointSize = size;
    } else {
        gl_PointSize = clamp(-size / gl_Position.w, 3.0, 10.0);
    }

#if defined(USE_TEXTURES_PROJECTIVE)
    #include <itowns/projective_texturing_vertex>
#endif
    #include <logdepthbuf_vertex>
}
