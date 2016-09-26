//#version 100

precision highp float;
precision highp int;

#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

const float SIZE_MULTIPLIER = 300.0;

attribute vec3  position;
attribute float size;
attribute vec3  customColor;

uniform float  opacity;
uniform mat4   projectionMatrix;
uniform mat4   modelViewMatrix;
uniform vec2   resolution;

varying vec4 vColor;

void main() {
		vColor = vec4( customColor, opacity );

		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

		vec4 projectedPoint = projectionMatrix * mvPosition;

                #ifdef USE_LOGDEPTHBUF

                    projectedPoint.z = log2(max( EPSILON, projectedPoint.w + 1.0 )) * logDepthBufFC;

                    #ifdef USE_LOGDEPTHBUF_EXT

                        vFragDepth = 1.0 + gl_Position.w;

                    #else

                        projectedPoint.z = (projectedPoint.z - 1.0) * projectedPoint.w;

                    #endif

                #endif            


                float spriteDist;

                if (projectedPoint.w == 0.0) {
                        spriteDist = 0.00001;
                } else {
                        spriteDist = projectedPoint.w;
                }

                gl_PointSize = (((size * SIZE_MULTIPLIER * (resolution.x/resolution.y)) / spriteDist) * (resolution.x/resolution.y));
                gl_Position  = projectedPoint;
}
