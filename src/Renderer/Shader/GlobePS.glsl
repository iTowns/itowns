uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[1];
uniform float       nbTextures_00;
uniform float       nbTextures_01;

varying vec2 vUv;

void main() {    
    
    if(nbTextures_00 > 0.0)
        if(nbTextures_01  == 0.0)
            gl_FragColor = texture2D( dTextures_00[0], vUv);
        else
            gl_FragColor = texture2D( dTextures_01[0], vUv);
    else 
        gl_FragColor = vec4( 0.2, 0.5, 1.0, 1.0);
}