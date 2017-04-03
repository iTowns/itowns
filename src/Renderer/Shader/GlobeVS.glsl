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
uniform bool        useRTC;
uniform float       periArcLati;
uniform mat4        mVPMatRTC;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;
uniform mat4        modelMatrix;

uniform vec3        mouse3D;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;
varying float       dist;
varying float       height;
varying float       kindaHeightMouse3D;

highp float decode32(highp vec4 rgba) {
    highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
    highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
    highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
}

//#define RGBA_ELEVATION
float dv;
void main() {

        vUv_WGS84 = uv_wgs84;
        vUv_PM = uv_pm;
        
        vec4 vPosition;

        if(loadedTexturesCount[0] > 0)
        {
            vec2    vVv = vec2(
                vUv_WGS84.x * offsetScale_L00[0].z + offsetScale_L00[0].x,
                (1.0 - vUv_WGS84.y) * offsetScale_L00[0].z + offsetScale_L00[0].y);


            #ifdef RGBA_ELEVATION
                vec4 rgba = texture2D( dTextures_00[0], vVv ) * 255.0;

                rgba.rgba = rgba.abgr;

                dv = max(decode32(rgba),0.0);

                // In RGBA elevation texture LinearFilter give some errors with nodata value.
                // need to rewrite sample function in shader
                // simple solution
                if(dv>5000.0)
                    dv = 0.0;

            #else
                 dv  = max(texture2D( dTextures_00[0], vVv ).w, 0.);
            #endif

            vNormal     = normal;
            vPosition   = vec4( position +  vNormal  * dv ,1.0 );
            height = dv;
        }
        else
            vPosition = vec4( position ,1.0 );


        pos = modelMatrix *  vPosition ;
        dist = distance(mouse3D, pos.xyz);
  //      if(dist < 1000.) {
            vec3 alpes = vec3(4491078.446235264, 4500291.881522427, -361203.25638397987);
            kindaHeightMouse3D = length(mouse3D) - length(alpes) + 300.;
           // float coef =  1. + (1000. - dist) / 10000.;
            float coef =  1.2;// + (1000. - dist) / 10000.;
           // vPosition   = vec4( position +  vNormal  * dv * coef ,1.0 );
            height = dv;

         //   if(height > kindaHeightMouse3D + 20.) vPosition   = vec4( position +  vNormal  * dv * coef ,1.0 );
             if(height <  1200.) vPosition   = vec4( position +  vNormal   ,1.0 );
            //vPosition.y += (1000. - dist) / 10.;
  //      }
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
