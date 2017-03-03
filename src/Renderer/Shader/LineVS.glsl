attribute vec3  position;
attribute vec3  previous;
attribute vec3  next;

attribute float side;
attribute float width;
attribute vec2 uv;

uniform bool useRTC;

uniform mat4 mVPMatRTC;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float THICKNESS;  // the thickness of the line in pixels
uniform float MITER_LIMIT;    // 1.0: always miter, -1.0: never miter, 0.75: default
uniform vec2 WIN_SCALE;  // the size of the viewport in pixels

uniform float opacity;
uniform bool sizeAttenuation;
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

    mat4 projModelViewMatrix = useRTC ? mVPMatRTC : projectionMatrix * modelViewMatrix;

    vec4 projectedPrePoint = projModelViewMatrix * vec4(previous,1.0);
    vec4 projectedCurPoint = projModelViewMatrix * vec4(position,1.0);
    vec4 projectedNextPoint = projModelViewMatrix * vec4(next,1.0);

    #ifdef USE_LOGDEPTHBUF

        #ifndef USE_LOGDEPTHBUF_EXT

            projectedPrePoint.z = (projectedPrePoint.z - 1.0) * projectedPrePoint.w;
            projectedCurPoint.z = (projectedCurPoint.z - 1.0) * projectedCurPoint.w;
            projectedNextPoint.z = (projectedNextPoint.z - 1.0) * projectedNextPoint.w;

        #else

            projectedPrePoint.z = log2(max( EPSILON, projectedPrePoint.w + 1.0 )) * logDepthBufFC;
            projectedCurPoint.z = log2(max( EPSILON, projectedCurPoint.w + 1.0 )) * logDepthBufFC;
            projectedNextPoint.z = log2(max( EPSILON, projectedNextPoint.w + 1.0 )) * logDepthBufFC;

        #endif

    #endif

    vec2 previousScreen = fix( projectedPrePoint,aspect );  // start of previous segment
    vec2 currentScreen = fix( projectedCurPoint ,aspect);   // end of previous segment, start of current segment
    vec2 nextScreen = fix( projectedNextPoint ,aspect); // end of current segment, start of next segment

    float pixelWidth = projectedCurPoint.w * pixelWidthRatio;
    float w = 1.8*pixelWidth * THICKNESS * width;

    if(sizeAttenuation) {
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

    #ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif
}