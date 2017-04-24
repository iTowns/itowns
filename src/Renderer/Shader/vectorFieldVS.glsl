
#ifdef USE_LOGDEPTHBUF

    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

#define EPSILON 1e-6

attribute vec3 colorCustom;
attribute vec3 arrival;
attribute float delay;
uniform float timing;
varying vec3 vColor;
varying float currentTimeDelayed;

void main()
{
    vColor = colorCustom;
    gl_PointSize = 2.;

   
    vec3 dist = arrival - position;
    currentTimeDelayed = mod(timing + delay , 1.);
    vec3 currentPos = position + currentTimeDelayed * dist; //(position + arrival) / 2.;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( currentPos,  1.0 );


    #ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif


}


