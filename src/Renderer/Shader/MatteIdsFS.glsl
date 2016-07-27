#extension GL_EXT_frag_depth : enable
precision highp float;
precision highp int;

#define SHADER_NAME ShaderMaterial
#define VERTEX_TEXTURES

#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif

uniform int  uuid;

uniform vec3 diffuseColor;


const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );

vec4 pack1K ( float depth ) {

    depth /= 10000.0;
    vec4 res = mod( depth * bitSh * vec4( 255 ), vec4( 256 ) ) / vec4( 255 );
    res -= res.xxyz * bitMsk;
    return res;
}


void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    gl_FragColor = pack1K(float(uuid));

}
