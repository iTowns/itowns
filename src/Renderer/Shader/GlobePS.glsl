uniform sampler2D   dTextures[1];
uniform float       nbTextures;

varying vec2 vUv;

void main() {    
    
    if(nbTextures > 0.0)
        gl_FragColor = texture2D( dTextures[0], vUv);
    else
        gl_FragColor = vec4( 0.2, 0.5, 1.0, 1.0);
}