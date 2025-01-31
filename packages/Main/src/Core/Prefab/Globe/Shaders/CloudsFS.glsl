#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;
    varying float vFragDepth;

#endif

uniform vec3 lightPosition;
uniform sampler2D diffuse;
uniform float time;
uniform bool lightingEnabled;
varying vec2  vUv;
varying vec3 pos;
varying vec3 vNormal;

float speed = 0.01;
float noiseScale = 0.005;

void main()
{
#if defined(USE_LOGDEPTHBUF)
    gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
#endif

    // Correct Y knowing image is -85 85
    vec2 vUv2 = vec2(vUv.x, clamp(vUv.y + (vUv.y - 0.5) * - 0.45, 0., 1.));
    float coefDistCam = (length(cameraPosition.xyz) - 6400000.) / 500000.;

    vec2 uvTime =  vUv2 + vec2( -0.1, .1 ) * mod(time * speed, 1.);
    vec4 noiseColor = texture2D( diffuse, uvTime );
    vec2 uvNoise = vUv2 + noiseScale * vUv2 * vec2(noiseColor.r, noiseColor.b );

    vec4 color = texture2D( diffuse, uvNoise); //texture2D( diffuse, vUv2 );
    float l = (max(color.r,max(color.g,color.b)) + min(color.r,min(color.g,color.b))) / 2.;
    l *= l*1.5;
    gl_FragColor =  0.25 +  (texture2D( diffuse, vUv2 ) * 0.95);
    gl_FragColor.b += 0.1;

    gl_FragColor.a = min(time * min( coefDistCam, 1.2) , 1.) * (vUv.y <= 0.75 ? l : (1. - ((vUv.y - 0.75) / 0.25)) * l  );

    if(lightingEnabled){   // Add lighting
        float light = min(2. * dot(vNormal, lightPosition),1.); //normalize(pos.xyz)
        gl_FragColor.a *= -light;
    }
}
