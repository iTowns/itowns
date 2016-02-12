#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif


uniform int atmoIN;
uniform vec2 screenSize;
uniform sampler2D diffuse;
varying float intensity;
varying vec2  vUv;


vec4 glowColor = vec4(0.45, 0.74, 1. ,1.0);

void main() 
{
     #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif
    
    // Correct Y knowing image is -85 85 
    vec2 vUv2 = vec2(vUv.x, vUv.y); //max(vUv.y - 0.05,0.) );
    
    gl_FragColor =  texture2D( diffuse, vUv2 ); //vec4(1,0,0,1);
    gl_FragColor.a = 0.85;

}

