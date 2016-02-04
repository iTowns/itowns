#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		//#extension GL_EXT_frag_depth : enable
		varying float vFragDepth;

	#endif

#endif

uniform vec3 diffuseColor;
varying float      ZY;
void main() {
 
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    //gl_FragColor = vec4(diffuseColor,1.0);

    

    vec4 fogColor = vec4( 0.0, 0.0, 0.0,1.0);

    vec4 color     =  vec4( diffuseColor,1.0);

    gl_FragColor = color;
}