uniform sampler2D uni[SAMPLE];
void main() {
    gl_FragColor += texture2D(uni[SAMPLE-1], vec2(0));
}