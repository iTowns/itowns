/*
#ifdef USE_LOGDEPTHBUF
    
    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif
*/
uniform sampler2D  dTextures_00[1];
uniform int        nbTextures_00;

varying vec2 vUv;
varying vec3 vNormal;



void main() {

        vUv = uv;
        
        //vUv.x = floor(uv.x * 20.0) /20.0;
        //vUv.y = floor(uv.y * 20.0) /20.0;
                

        if(nbTextures_00 > 0)
        {
            float dv = texture2D( dTextures_00[0], vUv ).w;

            vNormal  = normalize( position );

            //vec3 displacedPosition = position +  vNormal  * dv *10.0;
            vec3 displacedPosition = position +  vNormal  * dv ;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );
        }
        else
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position ,1.0 );

        /*
        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif
        */
}   