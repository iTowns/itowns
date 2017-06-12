//attribute vec2      uv;
attribute vec3      position;
attribute vec3      normal;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;

varying float      light;

// IE error : Initializer for const variable must initialize to a constant value
//const vec3 dir =  normalize(vec3(1.0,1.0,0.5));

void main()
{
    vec3 dir =  normalize(vec3(1.0, 1.0, 0.5));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    light = max(0.15 ,dot(dir,normal));

    #ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max(EPSILON, gl_Position.w + 1.0)) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif

}
