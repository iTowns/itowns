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
uniform vec2        bLongitude; 
uniform vec2        bLatitude;
uniform float       periArcLati;
uniform float       y0;
uniform float       zoom;
uniform int         debug;
varying vec2        vUv;

void main() {
 
    float latitude  = bLatitude.x + periArcLati*(1.0-vUv.y);
   
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
            
            //if(nbTextures_01 == 0)
            //    gl_FragColor = vec4( 0.85, 0.85, 0.00, 1.0);
            //else
            {
                vec2 uvO ;
                uvO.x           = vUv.x;
                float nbRow     = pow(2.0,zoom + 1.0);
                float y         = 0.5 - log(tan(PI4 + (latitude)*0.5))* INV_TWO_PI;
                uvO.y           = 1.0 - mod(y,1.0/ nbRow)*nbRow;
                float idStart   = floor( y0 * nbRow);
                float idRow     = floor( y  * nbRow);
                int   idd       = int(idRow - idStart);
                vec4  ortho     = vec4( 0.04, 0.23, 0.35, 1.0);


                if(idd >= nbTextures_01)
                {
                    idd     = nbTextures_01-1;
                    uvO.y   = 0.0;
                }
                else if(idd < 0)
                {
                    idd     = 0;
                    uvO.y   = 1.0;
                }

                
                for (int x = 0; x < TEX_UNITS; x++)
                    if (x == idd)
                    {                        
                        ortho  = texture2D( dTextures_01[x], uvO );
                        break;
                    }   

                gl_FragColor = ortho;
               
           }

         }      

         if(debug > 0)
            gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
/*
         if(nbTextures_00 > 0)
        {
                    float dv = texture2D( dTextures_00[0], vUv ).w /3000.0;
                    gl_FragColor = vec4( dv, dv, dv, 1.0);
        }
        else
            gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
        }
*/

}