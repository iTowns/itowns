
uniform sampler2D quadTexture;
varying vec2 vUv;

#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif

void main()
{


     vec4 currentColor = texture2D(quadTexture, vUv);

     gl_FragColor = vec4(currentColor.rgb, 0.8 *currentColor.a);

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

 
 }
