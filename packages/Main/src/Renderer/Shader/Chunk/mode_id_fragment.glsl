// 16777216.0 == 256.0 * 256.0 * 256.0
gl_FragColor = packDepthToRGBA(float(objectId) / 16777216.0);
