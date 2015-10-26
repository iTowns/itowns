uniform sampler2D  dTextures[1];

varying vec2 vUv;

void main() {    
    gl_FragColor = texture2D( dTextures[0], vUv);
}