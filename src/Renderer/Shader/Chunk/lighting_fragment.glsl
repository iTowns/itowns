if (lightingEnabled) {
    float light = min(2. * dot(vNormal, lightPosition), 1.);
    gl_FragColor.rgb *= light;
}
