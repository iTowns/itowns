#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;
    #define EPSILON 1e-6

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif
