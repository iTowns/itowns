#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		//#extension GL_EXT_frag_depth : enable
		varying float vFragDepth;

	#endif

#endif



//uniform sampler2D   dTextures_00[1];

const int   TEX_UNITS   = 8;
const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;
const float PI4         = 0.78539816339;
const float poleSud     = -82.0 / 180.0 * PI;
const float poleNord    =  84.0 / 180.0 * PI;

uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform int         nbTextures_00;
uniform int         nbTextures_01;
uniform float       bLatitude;
uniform float       periArcLati;
uniform float       distanceFog;
uniform int         debug;
varying vec2        vUv;
varying float       vUv2;

void main() {
 
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    float latitude  = bLatitude + periArcLati*(1.0-vUv.y);
   
    /*
    float sLine = 0.0015;
    if(vUv.x < sLine || vUv.x > 1.0 - sLine || vUv.y < sLine || vUv.y > 1.0 - sLine)
        gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
    else               
    */
    if(latitude < poleSud )
        gl_FragColor = vec4( 0.85, 0.85, 0.91, 1.0);
    else
    
    if(latitude > poleNord)
        gl_FragColor = vec4( 0.04, 0.23, 0.35, 1.0);
    else
    {                           
        vec2 uvO ;
        uvO.x           = vUv.x;
        float y         = vUv2;
        int idd         = int(floor(y));
        uvO.y           = y - float(idd);
        idd             = nbTextures_01 - idd - 1;

        if(nbTextures_01 == idd)
        {
            idd     = nbTextures_01 - 1 ;
            uvO.y   = 0.0;
        }    
         
        gl_FragColor    = vec4( 0.04, 0.23, 0.35, 1.0);

        float depth = gl_FragDepthEXT / gl_FragCoord.w;
        //float distanceFog = 600000.0;
        //float fog = (distanceFog-depth)/distanceFog; // linear fog

        float fog = 1.0/(exp(depth/distanceFog)); 

        vec4 fogColor = vec4( 0.76, 0.85, 1.0, 1.0); 

        for (int x = 0; x < TEX_UNITS; x++)
            if (x == idd)
            {                        
                vec4 diffuseColor  = texture2D( dTextures_01[x], uvO ) ;

                gl_FragColor = mix(fogColor, diffuseColor, fog );
                break;
            }
    }

        if(debug > 0)
           gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

} 
