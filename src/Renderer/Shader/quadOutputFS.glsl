
uniform sampler2D quadTexture;
varying vec2 vUv;

void main()
{


     vec3 currentColor = texture2D(quadTexture, vUv).rgb;

     gl_FragColor = vec4(currentColor, 1.0);

 
 }
