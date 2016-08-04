#version 100

precision highp float;
precision highp int;

//#define SHADER_NAME LineShaderMaterial

#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

attribute vec3  position;
attribute vec3  previous;
attribute vec3  next;

attribute float side;
attribute float width;
attribute vec2 uv;


uniform mat4   projectionMatrix;
uniform mat4   modelViewMatrix;

uniform float	THICKNESS;	// the thickness of the line in pixels
uniform float	MITER_LIMIT;	// 1.0: always miter, -1.0: never miter, 0.75: default
uniform vec2	WIN_SCALE;	// the size of the viewport in pixels

uniform float opacity;
uniform float sizeAttenuation;
uniform vec3 color;

varying vec2 vUV;
varying vec4 vColor;
varying vec3 vPosition;


vec2 screen_space(vec4 vertex)
{
	return vec2( vertex.xy / vertex.w ) * WIN_SCALE;
}

vec2 fix( vec4 i, float aspect ) {
    vec2 res = i.xy / i.w;
    res.x *= aspect;
    return res;
}

void main() {

                float aspect = WIN_SCALE.x / WIN_SCALE.y;
        	float pixelWidthRatio = 1. / (WIN_SCALE.x * projectionMatrix[0][0]);
                vColor = vec4( color, opacity );
                vUV = uv;

		vec4 projectedPrePoint = projectionMatrix * modelViewMatrix * vec4(previous,1.0);
		vec4 projectedCurPoint = projectionMatrix * modelViewMatrix *vec4(position,1.0);
		vec4 projectedNextPoint = projectionMatrix * modelViewMatrix *vec4(next,1.0);

                #ifdef USE_LOGDEPTHBUF

                    projectedPrePoint.z = log2(max( EPSILON, projectedPrePoint.w + 1.0 )) * logDepthBufFC;
                    projectedCurPoint.z = log2(max( EPSILON, projectedCurPoint.w + 1.0 )) * logDepthBufFC;
                    projectedNextPoint.z = log2(max( EPSILON, projectedNextPoint.w + 1.0 )) * logDepthBufFC;

                    #ifdef USE_LOGDEPTHBUF_EXT

                        vFragDepth = 1.0 + gl_Position.w;

                    #else

                        projectedPrePoint.z = (projectedPrePoint.z - 1.0) * projectedPrePoint.w;
                        projectedCurPoint.z = (projectedCurPoint.z - 1.0) * projectedCurPoint.w;
                        projectedNextPoint.z = (projectedNextPoint.z - 1.0) * projectedNextPoint.w;

                    #endif

                #endif

                
                vec2 previousScreen = fix( projectedPrePoint,aspect );	// start of previous segment
                vec2 currentScreen = fix( projectedCurPoint ,aspect);	// end of previous segment, start of current segment
                vec2 nextScreen = fix( projectedNextPoint ,aspect);	// end of current segment, start of next segment


                float pixelWidth = projectedCurPoint.w * pixelWidthRatio;
                float w = 1.8*pixelWidth * THICKNESS * width;

                if(sizeAttenuation == 1.0) {
                        w = 1.8 * THICKNESS * width;
                }

                //starting point uses (next - current)
                vec2 dir = vec2(0.0);
                //float len = THICKNESS;

                if (currentScreen == previousScreen) {
                        dir = normalize(nextScreen - currentScreen);
                } 
                //ending point uses (current - previous)
                else if (currentScreen == nextScreen) {
                       dir = normalize(currentScreen - previousScreen);
                }
                //somewhere in middle, needs a join
                else {
                         //get directions from (C - B) and (B - A)
                         vec2 dirA = normalize((currentScreen - previousScreen));
                         if (MITER_LIMIT == 1.0) {
                                vec2 dirB = normalize(nextScreen - currentScreen);
                                //now compute the miter join normal and length
                                vec2 tangent = normalize(dirA + dirB);
                                vec2 perp = vec2(-dirA.y, dirA.x);
                                vec2 miter = vec2(-tangent.y, tangent.x);
                                dir = tangent;
                                //len = THICKNESS / dot(miter, perp);
                                //w = clamp( w / dot( miter, perp ), 0., 4. * THICKNESS * width );
                        } else {
                             dir = dirA;
                        }
                }

                vec2 normal = vec2(-dir.y, dir.x);
                normal.x /= aspect;
                normal *= 0.5 * w;
                //normal *= len/2.0;

                vec4 offset = vec4(normal*side, 0.0, 1.0);
                projectedCurPoint.xy += offset.xy;
               
                vPosition    = ( modelViewMatrix * vec4( position, 1. ) ).xyz;
                gl_Position  = projectedCurPoint;
                gl_PointSize = 10.0;
}