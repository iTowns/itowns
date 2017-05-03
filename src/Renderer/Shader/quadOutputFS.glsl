
uniform sampler2D quadTexture;
varying vec2 vUv;

void main()
{


     vec4 currentColor = texture2D(quadTexture, vUv);

     gl_FragColor = vec4(currentColor.rgb, 0.8 *currentColor.a);

 
 }
