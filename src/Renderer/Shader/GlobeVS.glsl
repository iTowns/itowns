
#ifdef USE_LOGDEPTHBUF
    
    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

attribute float uv2;

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI4         = 0.78539816339;

uniform sampler2D  dTextures_00[1];
uniform int        nbTextures_00;
uniform vec2       bLatitude;
uniform vec3       pitScale;
uniform float      periArcLati;
uniform float      zoom;
uniform mat4       mVPMatRTC;

varying vec2    vUv;
varying float   vUv2;
varying vec3    vNormal;

void main() {

        //
        vUv     = uv;
        //vUv     = vec2(vUv.x*pitScale.z + pitScale.x,vUv.y*pitScale.z + pitScale.y);
        vUv2    = uv2;

        //vUv.x = floor(uv.x * 20.0) /20.0;
        //vUv.y = floor(uv.y * 20.0) /20.0;

        if(nbTextures_00 > 0)
        {
            vec2 vVv  = vec2(vUv.x*pitScale.z + pitScale.x,vUv.y*pitScale.z + pitScale.y);
                
            float dv = texture2D( dTextures_00[0], vVv ).w;

            vNormal  = normal;//normalize( position );

            //vec3 displacedPosition = position +  vNormal  * dv *10.0;
            vec3 displacedPosition = position +  vNormal  * dv ;

            //gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );
            
            gl_Position = mVPMatRTC * vec4( displacedPosition ,1.0 );
            //gl_Position = mVPMatRTC * vec4( position ,1.0 );
        }
        else
            //gl_Position = projectionMatrix * modelViewMatrix * vec4( position ,1.0 );
            gl_Position = mVPMatRTC * vec4( position ,1.0 );

        
        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif
        
}   