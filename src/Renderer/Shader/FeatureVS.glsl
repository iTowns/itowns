#version 100

precision highp float;
precision highp int;

#define SHADER_NAME SimpleMaterial
#define VERTEX_TEXTURES

#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

//attribute vec2      uv;
attribute vec3      position;
attribute vec3      normal;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;

uniform mat4       mVPMatRTC;
uniform int        RTC;
varying float      light;

attribute vec3 color;
varying vec3 vColor;

// IE error : Initializer for const variable must initialize to a constant value
//const vec3 dir =  normalize(vec3(1.0,1.0,0.5));

void main()
{

  vColor = color;
  vec3 dir =  normalize(vec3(1.0,1.0,0.5));

  if(RTC == 0)
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position,  1.0 );
  else
        gl_Position = mVPMatRTC * vec4( position ,1.0 );

    float h  = max(0.05,(1.0 - min(position.y / 50.0,1.0)));

    //light    =   h / max(0.25,dot(dir,normal));
    light = 2.0 - dot(dir,normalize(normal));

    #ifdef USE_LOGDEPTHBUF

        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

        #ifdef USE_LOGDEPTHBUF_EXT

            vFragDepth = 1.0 + gl_Position.w;

        #else

            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

        #endif

    #endif

}
