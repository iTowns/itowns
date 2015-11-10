/*
#ifdef USE_LOGDEPTHBUF

    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

#define EPSILON 1e-6
*/

uniform int atmoIN;
varying float intensity;
vec3 normalES;
vec3 normalCAMES;

void main() 
{
    normalES = normalize( normalMatrix * normal );
    normalCAMES = normalize( normalMatrix * cameraPosition );

    if(atmoIN == 0)
        intensity = pow( 0.55 - dot(normalES, normalCAMES), 4. ); 
      else
        intensity = pow( 1.  - dot(normalES, normalCAMES), 0.8 );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    /*
    #ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif
    */
}


