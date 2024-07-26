for(int i = 0; i < ORIENTED_IMAGES_COUNT; ++i)
    projectiveTextureCoords[i] = projectiveTextureMatrix[i] * mvPosition;
