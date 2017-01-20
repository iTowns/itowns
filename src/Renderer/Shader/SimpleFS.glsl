#define SHADER_NAME simpleMaterial

uniform vec3 diffuseColor;
uniform bool lightOn;
varying float light;
varying vec3 vColor;

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    vec4 dColor = vec4( diffuseColor, 1.0);
    vec4 color = lightOn ? vec4( (vColor) * 0.666 + 0.333, 1.0) * light * dColor : dColor * vec4(vColor, 1.0);

    gl_FragColor = color;
}