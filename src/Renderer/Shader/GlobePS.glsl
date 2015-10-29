uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[4];
uniform float       nbTextures_00;
uniform float       nbTextures_01;
uniform vec2        bLongitude; 
uniform vec2        bLatitude;
uniform float       periArcLati;
uniform float       y0;
uniform float       zoom;
varying vec2        vUv;

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;
const float PI4         = 0.78539816339;
const float poleSud     = -82.0 / 180.0 * PI;
const float poleNord    =  84.0 / 180.0 * PI;

float clampLat(float latitude)
{
    float PI   = 3.14159265359;
    float minl = -86.0  / 180.0 * PI;
    float maxl =  84.0  / 180.0 * PI;

    latitude = max(minl,latitude);
    latitude = min(maxl,latitude);

    return latitude;
}

void main() {
    
    float latitude  = bLatitude.x + periArcLati*(1.0-vUv.y);
    float degree    = (latitude) / PI * 180.0;

    if(latitude < poleSud )
        gl_FragColor = vec4( 0.85, 0.85, 0.91, 1.0);
    else if(latitude > poleNord)
        gl_FragColor = vec4( 0.04, 0.23, 0.35, 1.0);
    else
        {                           
            vec2 uvO ;
            uvO.x           = vUv.x;
            float nbRow     = pow(2.0,zoom + 1.0);
            float y         = 0.5 - log(tan(PI4 + (latitude)*0.5))* INV_TWO_PI;
            uvO.y           = 1.0 - mod(y,1.0/ nbRow)*nbRow;
            float idStart   = floor( y0 * nbRow);
            float idRow     = floor( y  * nbRow);
            int   idd       = int(idRow - idStart);
            vec4  ortho     = vec4( 1.0,0.0,0.0, 1.0);

            for (int x = 0; x < 15; x++)
                if (x == idd )
                    ortho  = texture2D( dTextures_01[x], uvO );

            vec4 eleva  = texture2D( dTextures_00[0], vUv);
            gl_FragColor = ortho; //+  vec4( eleva.x *1.5,0.0,0.0, 1.0);
            
            /*
            if(eleva.x == 0.0)
                gl_FragColor = vec4( 0.5, 0.5, 0.5, 1.0);
            else
                gl_FragColor = eleva*2.0;
            */

        }                   
}