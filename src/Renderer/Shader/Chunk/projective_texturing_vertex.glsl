for(int i = 0; i < NUM_TEXTURES; ++i)
    projectiveTextureCoords[i] = projectiveTextureMatrix[i] * mvPosition;
