#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif


uniform sampler2D diffuse;
varying vec2  vUv;


vec4 glowColor = vec4(0.45, 0.74, 1. ,1.0);

void main() 
{
     #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif
    
    // Correct Y knowing image is -85 85 
    vec2 vUv2 = vec2(vUv.x, clamp(vUv.y + (vUv.y - 0.5) * - 0.45, 0., 1.));
    
    vec4 color = texture2D( diffuse, vUv2 );
    float l = (max(color.r,max(color.g,color.b)) + min(color.r,min(color.g,color.b))) / 2.;
    l *= l*1.5;
    gl_FragColor =  0.85 +  (texture2D( diffuse, vUv2 ) * 0.95);
    gl_FragColor.b += 0.1;
    float coefDistCam = min( (length(cameraPosition.xyz) - 6400000.) / 500000., 1.2);
    gl_FragColor.a = coefDistCam * (vUv.y <= 0.75 ? l : (1. - ((vUv.y - 0.75) / 0.25)) * l  );

}

