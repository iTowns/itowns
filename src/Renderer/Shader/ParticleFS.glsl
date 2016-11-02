#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif

uniform float time;
uniform vec3  color;
uniform sampler2D texture;
varying vec3  vColor;

void main() {

 #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
 #endif

    //gl_FragColor = vec4( color * vColor, 1.0 );
    gl_FragColor = texture2D( texture, gl_PointCoord );
    //gl_FragColor.rgb *= 0.02;
    gl_FragColor.a *= 0.05;//8;
}
