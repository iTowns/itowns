uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[15];
uniform float       nbTextures_00;
uniform float       nbTextures_01;
uniform vec2        bLongitude; 
uniform vec2        bLatitude;
uniform float       zoom;
varying vec2        vUv;

void main() {    
    
    if(nbTextures_00 > 0.0)
        if(nbTextures_01  == 0.0)
            gl_FragColor = texture2D( dTextures_00[0], vUv);
        else
        {            
            float PI    = 3.14159265359;
            float PI2   = 1.57079632679;
            vec2 uvO ;
            float nbRow = nbTextures_01 / 2.0;            
            uvO.x       = vUv.x;            
            float id    = floor(vUv.y*nbRow);            
            int  idd    = int(floor(id));
            float s     = 1.0 / nbRow;    
            uvO.y       = 1.0-(vUv.y - id*s)/s;

            float nbTex         = pow(2.0,zoom);
            float arcLatitude   = PI / nbTex;
            float arcTileLat    = abs(bLatitude.y - bLatitude.x);
            float latitude      = bLatitude.x + arcTileLat*(1.0-vUv.y);

            float y             = 0.5 + log(tan(PI2*0.5 + latitude*0.5))/(2.0*PI);
            uvO.y = y;
                                                    
            for (int x = 0; x < 15; x++)
            { 
                if (x == idd )
                {
                    vec4 ortho   = texture2D( dTextures_01[x], uvO );
                    vec4 eleva   = texture2D( dTextures_00[0], vUv);
                    //gl_FragColor = ortho + eleva * 0.333;                        
                    gl_FragColor = eleva;                        
                    //gl_FragColor = vec4( 0.0, uvO.y, 0.0, 1.0);
                }
            }                    
        }           
    else 
        gl_FragColor = vec4( 0.2, 0.5, 1.0, 1.0);
}