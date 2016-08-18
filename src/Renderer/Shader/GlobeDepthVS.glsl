attribute vec2      uv_wgs84;
attribute vec3      position;
attribute vec3      normal;

uniform sampler2D   dTextures_00[1];
uniform vec4        pitScale_L00[1];
uniform int         nbTextures;
uniform mat4        mVPMatRTC;
uniform float       zOffset;

void main() {

        vec4 vPosition;

        if(nbTextures > 0) {
            vec2    vVv = pitUV(uv_wgs84, pitScale_L00[0]);

            float   dv  = max(texture2D( dTextures_00[0], vVv ).r, 0.) * 255.0 + zOffset;

            vPosition   = vec4(position + normal * dv, 1.0 );
        }
        else {
            vPosition = vec4(position, 1.0);
        }

        gl_Position = mVPMatRTC * vPosition;

        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif

}
