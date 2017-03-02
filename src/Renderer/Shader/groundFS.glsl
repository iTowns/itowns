varying vec3 c0;
varying vec3 c1;

void main (void) {
	gl_FragColor = vec4(c1, 1.0 - c0/4.);
}