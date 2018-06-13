#if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
gl_FragColor = packDepthToRGBA(gl_FragDepthEXT);
#else
gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
#endif
