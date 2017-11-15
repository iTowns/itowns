#include <logdepthbuf_pars_vertex>
#define EPSILON 1e-6

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI4         = 0.78539816339;

attribute float     uv_pm;
attribute vec2      uv_wgs84;
attribute vec3      position;
attribute vec3      normal;

uniform sampler2D   dTextures_00[1];
uniform vec3        offsetScale_L00[1];
uniform int         loadedTexturesCount[8];

uniform float       zFactor;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;

highp float decode32(highp vec4 rgba) {
    highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
    highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
    highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
}

void main() {

        vUv_WGS84 = uv_wgs84;
        vUv_PM = uv_pm;

        vec4 vPosition;

        vNormal = normal;

        if(loadedTexturesCount[0] > 0) {
            vec2    vVv = vec2(
                vUv_WGS84.x * offsetScale_L00[0].z + offsetScale_L00[0].x,
                (1.0 - vUv_WGS84.y) * offsetScale_L00[0].z + offsetScale_L00[0].y);

            #if defined(RGBA_TEXTURE_ELEVATION)
                vec4 rgba = texture2D( dTextures_00[0], vVv ) * 255.0;

                rgba.rgba = rgba.abgr;

                float dv = max(decode32(rgba),0.0);

                // TODO In RGBA elevation texture LinearFilter give some errors with nodata value.
                // need to rewrite sample function in shader
                // simple solution
                if(dv>5000.0) {
                    dv = 0.0;
                }

            #elif defined(DATA_TEXTURE_ELEVATION)
                float   dv  = texture2D( dTextures_00[0], vVv ).w;
            #elif defined(COLOR_TEXTURE_ELEVATION)
                float   dv  = max(texture2D( dTextures_00[0], vVv ).r, 0.);
                dv = _minElevation + dv * (_maxElevation - _minElevation);
            #else

            dv *=zFactor;

            #error Must define either RGBA_TEXTURE_ELEVATION, DATA_TEXTURE_ELEVATION or COLOR_TEXTURE_ELEVATION
            #endif

            vPosition = vec4( position +  vNormal  * dv ,1.0 );
        } else {
            vPosition = vec4( position ,1.0 );
        }

        gl_Position = projectionMatrix * modelViewMatrix * vPosition;
        #include <logdepthbuf_vertex>
}
