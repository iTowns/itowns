#define SHADER_NAME simpleMaterial

uniform vec3 diffuseColor;
uniform bool lightingEnabled;
uniform bool enabledCutColor;
uniform float opacity;
varying float light;
varying vec3  vColor;
varying vec3  vPosition;

const float line = 0.05;

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    vec3 cutColor = diffuseColor;

    if (enabledCutColor) {
        if (vPosition.y > 9.0) {
            cutColor = vec3(1.0,0.2,0.1);
        }
    }

    vec3 color = vColor * cutColor;

    if (lightingEnabled) {
        color = ((vColor) * 0.666 + 0.333) * light * cutColor;
    }

    gl_FragColor = vec4(color, 1.0);
}