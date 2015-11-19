#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        #extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif


uniform int atmoIN;
uniform vec2 screenSize;
varying float intensity;

vec4 glowColor = vec4(0.45, 0.74, 1. ,1.0);

void main() 
{
     #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    float orientedintensity  = intensity * (screenSize.x - gl_FragCoord.x)/(screenSize.x/2.);
    gl_FragColor = glowColor * orientedintensity;

}

