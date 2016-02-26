
#ifdef USE_LOGDEPTHBUF
    
    #define EPSILON 1e-6
    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

attribute float     uv1;

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI4         = 0.78539816339;

uniform sampler2D   dTextures_00[1];
uniform int         nbTextures_00;
uniform int         RTC;
uniform vec3        pitScale;
uniform float       periArcLati;
uniform mat4        mVPMatRTC;
uniform int         pickingRender;
uniform int         animateWater;
uniform float       waterHeight; // above ellipsoid

varying vec2        vUv_0;
varying float       vUv_1;
varying vec2        vVv;
varying vec3        vNormal;
varying vec4        pos;
varying float        dv;

void main() {
        
        vUv_0    = uv;        
        vUv_1    = uv1;

        vec4 vPosition;

        if(nbTextures_00 > 0)
        {
                    vVv = vec2(vUv_0.x*pitScale.z + pitScale.x,vUv_0.y*pitScale.z + pitScale.y);                
                    dv  = texture2D( dTextures_00[0], vVv ).w;
            vNormal     = normal;
            vPosition   = vec4( position +  vNormal  * dv ,1.0 );   

            // TODO separate animateWater and enableSea
            if (animateWater==1) { // If animateWater, water surface appears
                if (dv <= waterHeight) {
                    vPosition   = vec4( position +  vNormal * waterHeight ,1.0 );
                }
            }
        }
        else
            vPosition = vec4( position ,1.0 );

        if(pickingRender == 1)
            pos = modelViewMatrix * vPosition;

        mat4 projModelViewMatrix = (RTC == 0) ? projectionMatrix * modelViewMatrix : mVPMatRTC;

        gl_Position = projModelViewMatrix * vPosition;
                
        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;
            
            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif
        
}   