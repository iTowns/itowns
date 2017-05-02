
#ifdef USE_LOGDEPTHBUF

    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

#define EPSILON 1e-6

uniform sampler2D positions; //RenderTarget containing the transformed positions
uniform sampler2D gribVectors;

varying float vSpeed;

void main()
{
    gl_PointSize = 1.; 


    //the mesh is a normalized square so the uvs = the xy positions of the vertices
    vec4 posAndSpeed = texture2D( positions, position.xy );  // xyz:pos, w:speed
    vSpeed = posAndSpeed.w;
    //pos now contains a 3D position in space, we can use it as a regular vertex
    //regular projection of our position
    gl_Position = projectionMatrix * modelViewMatrix * vec4( posAndSpeed.xyz, 1.0 );



     #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

      #endif
}


