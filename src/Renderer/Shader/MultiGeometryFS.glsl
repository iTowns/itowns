uniform vec3 diffuseColor;
uniform int  lightOn;
uniform int  selected;
varying float      light;
varying float idx;

uniform sampler2D normalTexture;
uniform vec2 resolution;
uniform vec3 colors[GEOMETRY_COUNT];


vec3 colorToNormal(vec3 color) {
    return color.xyz * 2.0 - 1.0;
}

vec2 computeScreenUV(vec2 d) {
    return vec2((gl_FragCoord.x + d.x) / resolution.x, (gl_FragCoord.y + d.y) / resolution.y);
}

varying vec3 vCenter;

float edgeFactorTri() {
    vec3 d = fwidth(vCenter.xyz);
    vec3 a3 = smoothstep(vec3(0.0), d * 1.5, vCenter.xyz);
    return min(min(a3.x, a3.y), a3.z);
}


void main() {
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

    gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    vec4 color    =  (lightOn ==1 )? vec4( diffuseColor / light,1.0) : vec4( diffuseColor, 1.0);

    vec4 colorAtCenter = texture2D(normalTexture, computeScreenUV(vec2(0.0)));
    vec3 normalAtFragment = colorToNormal(colorAtCenter.xyz);
    float distAtCenter = colorAtCenter.w;

    float dx = 1.0 / resolution.x;
    float dy = 1.0 / resolution.y;

    float threshold = 0.7;
    float thresholdDist = 0.5;

    /*for (int i=-1; i<=1; i+=1) {
        for (int j=-1; j<=1; j+=1) {
            vec4 color = texture2D(normalTexture, computeScreenUV(vec2(i, j)));
            vec3 normalAtOffset = colorToNormal(color.xyz);
            float dist = color.w;

            if (dot(normalAtOffset, normalAtFragment) < threshold) {
                gl_FragColor = vec4(0.3, 0.3, 0.3, 1.0);
                return;
            }
            // else if (abs(dist - distAtCenter) > thresholdDist) {
            //     gl_FragColor = vec4(0.5, 0.1, 0.1, 1.0);
            //     return;
            // }
        }
    }*/

    float l = min(1.0, light);
    for(int i = 0; i < GEOMETRY_COUNT; i++) {
        if(i == int(floor(idx + 0.5))) {
            color = vec4(l * colors[i], 1.0);
        }
    }
    if(selected == int(floor(idx + 0.5)) + 1) {
        color = mix(vec4(1.0, 0.3, 0.0, 1.0), color, 0.5);
    }

    gl_FragColor = color;//vec4(light, light, light, 1.0);

    gl_FragColor.rgb = mix(vec3(0.0), color.rgb, edgeFactorTri());
    // gl_FragColor = texture2D(normalTexture, computeScreenUV(vec2(0.0)));
}
