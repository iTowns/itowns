attribute vec3      position;
attribute vec3      normal;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;


uniform int        RTC;
uniform mat4       mVPMatRTC;
varying vec3 vNormal;

void main() {

  if(RTC == 0)
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position,  1.0 );
  else
         gl_Position = mVPMatRTC * vec4( position ,1.0 );


        vNormal = normalize(normal);


        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif

}
