uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[15];
uniform float       nbTextures_00;
uniform float       nbTextures_01;
uniform vec2        bLongitude; 
uniform vec2        bLatitude;
uniform float       zoom;
varying vec2        vUv;

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
    
    if(nbTextures_00 > 0.0)
        if(nbTextures_01  == 0.0)
            gl_FragColor = texture2D( dTextures_00[0], vUv);
        else
        {            
            float PI    = 3.14159265359;
            float INV_TWO_PI= 1.0 / (2.0*PI);
            float PI2   = 1.57079632679;
            float PI4   = 0.78539816339;
            vec2 uvO ;
             
            uvO.x       = vUv.x;   

            float nbRow     = pow(2.0,zoom + 1.0);
            float arcLat    = PI / nbRow;
            float arcTiLat  = abs(bLatitude.y - bLatitude.x);
            float latitude  = bLatitude.x + arcTiLat*(1.0-vUv.y);
            float y         = 0.5 - log(tan(PI4 + (clampLat(latitude))*0.5))* INV_TWO_PI;
            float sy        = 0.5 - log(tan(PI4 + clampLat(bLatitude.y)*0.5))*INV_TWO_PI;
            float tY        = 1.0 / nbRow;
            uvO.y           = 1.0 - mod(y,tY)*nbRow;
            float idStart   = floor(sy * nbRow);
            float idRow     = floor( y * nbRow);

            int idd         = int(idRow - idStart);
            vec4 ortho      = vec4( 1.0,0.0,0.0, 1.0);

            for (int x = 0; x < 15; x++)
            { 
                if (x == idd )
                {
                    ortho  = texture2D( dTextures_01[x], uvO );                                                                                    
                }
            }       

            //float debug =  idRow / (nbRow -1.0);

            float debug =  float(idd) / (nbTextures_01) ;

            vec4 color  = vec4( debug,debug,debug, 1.0);
            vec4 eleva  = texture2D( dTextures_00[0], vUv);
            //gl_FragColor = eleva ;  
            //gl_FragColor = color + eleva * 0.3333;
            gl_FragColor = ortho +  vec4( eleva.x *1.5,0.0,0.0, 1.0);
            //gl_FragColor = ortho ;
            //gl_FragColor = color;

            float degree = (latitude) / PI * 180.0;

            if(degree > 84.0 )
                gl_FragColor = vec4( 0.85, 0.85, 0.91, 0);
//                gl_FragColor = vec4( 0.0, 1.0, 0.0, 1.0);
            else if(degree < -86.0)
                gl_FragColor = vec4( 0.04, 0.23, 0.35, 0);
                //gl_FragColor = vec4( 0.0, 1.0, 0.0, 1.0);

        }           
    else 
        gl_FragColor = vec4( 0.2, 0.5, 1.0, 1.0);

        
}