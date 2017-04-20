const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI4         = 0.78539816339;

attribute float     uv_pm;
attribute vec2      uv_wgs84;
attribute vec3      position;
attribute vec3      normal;

uniform sampler2D   dTextures_00[2];
uniform float       elevationTextureWeight[2];
uniform vec3        offsetScale_L00[2];

uniform bool        useRTC;
uniform mat4        mVPMatRTC;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;

varying float altitude;

highp float decode32(highp vec4 rgba) {
    highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
    highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
    highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
}

float dvFromTexture(int idx) {
    if (elevationTextureWeight[idx] <= 0.0) {
        return 0.0;
    }
    vec2  vVv = vec2(
        uv_wgs84.x * offsetScale_L00[idx].z + offsetScale_L00[idx].x,
        (1.0 - vUv_WGS84.y) * offsetScale_L00[idx].z + offsetScale_L00[idx].y);

    return elevationTextureWeight[idx] *
              max(texture2D(dTextures_00[idx], vVv).w, 0.);
}

void main() {

        vUv_WGS84 = uv_wgs84;
        vUv_PM = uv_pm;
        vNormal     = normal;

        float dv = dvFromTexture(0) + dvFromTexture(1);
        altitude = dv;

        vec4 vPosition   = vec4( position +  vNormal  * dv ,1.0 );

        mat4 projModelViewMatrix = useRTC ? mVPMatRTC : projectionMatrix * modelViewMatrix;

        gl_Position = projModelViewMatrix * vPosition;

        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif

}
