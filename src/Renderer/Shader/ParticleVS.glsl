
#ifdef USE_LOGDEPTHBUF

    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

#define EPSILON 1e-6

uniform   float time;
attribute float size;
attribute float maxDist;
attribute vec3 customColor;
varying   vec3 vColor;

void main() {

    vColor = customColor;
    vec3 addedPos = customColor * time / 10.;
    float len = length(addedPos);
    vec3 newPos = position + mod(len, maxDist) * customColor; 
    vec4 mvPosition = modelViewMatrix * vec4( newPos, 1.0 );
    gl_PointSize = size*10. * ( 300.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;

#ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif

}
