#version 100

#extension GL_EXT_frag_depth : enable

#define SHADER_NAME simpleMaterial
#define VERTEX_TEXTURES

precision highp float;
precision highp int;

#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		varying float vFragDepth;

	#endif

#endif

uniform vec3 diffuseColor;
uniform int  lightOn;
varying float      light;

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    vec4 color    =  (lightOn ==1 )? vec4( diffuseColor / light,1.0) : vec4( diffuseColor, 1.0);

    gl_FragColor = color;
}