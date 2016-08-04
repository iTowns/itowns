//#extension GL_OES_standard_derivatives : enable

precision highp float;
precision highp int;


#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif


uniform vec3 color;
uniform sampler2D texture;
uniform float useTexture;
uniform float  opacity;

varying vec4 vColor;

void main() {
		
        vec4 c = vColor;
        if( useTexture == 1. ) {
            c = texture2D( texture, gl_PointCoord );
            float alpha = step(0.9, c.a);
            gl_FragColor = c;//vec4(c.rgb * vLighting, c.a);
            gl_FragColor *= alpha;
	}else
            gl_FragColor = c;
}