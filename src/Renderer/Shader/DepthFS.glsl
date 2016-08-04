
#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		//#extension GL_EXT_frag_depth : enable
		varying float vFragDepth;

	#endif

#endif


//uniform float       distanceFog;


void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
        float depth = gl_FragDepthEXT / gl_FragCoord.w;

    #else
        float depth =  gl_FragCoord.w;
    #endif


        float distanceFog = 150000.0;
        float fog = (distanceFog-depth)/distanceFog; // linear fog

        //float   fog          = 1.0/(exp(depth/distanceFog));
        vec4    fogColor     = vec4( 1.0, 1.0, 1.0, 1.0);
        vec4    diffuseColor = vec4( 0.5, 0.5, 0.5, 1.0); ;

        //gl_FragColor = mix(fogColor, diffuseColor, fog );


        gl_FragColor = vec4( fog, fog, fog, 1.0);

}
