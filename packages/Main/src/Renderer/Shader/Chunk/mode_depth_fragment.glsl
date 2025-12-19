#if defined(USE_LOGARITHMIC_DEPTH_BUFFER)
gl_FragColor = packDepthToRGBA(gl_FragDepthEXT);
#else
float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
gl_FragColor = packDepthToRGBA(fragCoordZ);
#endif
