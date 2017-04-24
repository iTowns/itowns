#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif


varying vec3 vColor;
varying float currentTimeDelayed;

void main()
{
     
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
        gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
    #endif


 vec2 coord = gl_PointCoord - vec2(0.5);  //from [0,1] to [-0.5,0.5]
    if(length(coord) > 0.5)                  //outside of circle radius?
        discard;

    gl_FragColor = vec4(vColor, 0.8 *(1. - currentTimeDelayed));//vec4( 1.0, 0.0, 1.0, 1.0 );
}