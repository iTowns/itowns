
uniform int atmoIN;
uniform vec2 screenSize;
varying float intensity;

vec4 glowColor = vec4(0.45, 0.74, 1. ,1.);

void main() 
{

        float orientedintensity  = intensity * (screenSize.x - gl_FragCoord.x)/(screenSize.x/2.);
        gl_FragColor = glowColor * orientedintensity;
 
}

