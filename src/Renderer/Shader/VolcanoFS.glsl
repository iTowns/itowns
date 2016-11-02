#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif

varying vec2 vUv;
varying float noise;
uniform sampler2D tExplosion;

float random( vec3 scale, float seed ){
  return fract( sin( dot( gl_FragCoord.xyz + seed, scale ) ) * 43758.5453 + seed ) ;
}

void main() {

 #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
 #endif

  float r = .01 * random( vec3( 12.9898, 78.233, 151.7182 ), 0.0 );
  vec2 tPos = vec2( 0,  1.3 * noise + r );
  vec4 color = texture2D( tExplosion, tPos );
  gl_FragColor = vec4( color.rgb, 1.0 );

}
