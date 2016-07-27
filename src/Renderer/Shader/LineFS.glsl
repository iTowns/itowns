#extension GL_OES_standard_derivatives : enable
//#define SHADER_NAME LineShaderMaterial

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

uniform sampler2D texture;
uniform float useTexture;

varying vec2 vUV;
varying vec4 vColor;
varying vec3 vPosition;

void main() {
	vec4 c = vColor;
        if( useTexture == 1. ) c = texture2D( texture, vUV );
        gl_FragColor = c;
}