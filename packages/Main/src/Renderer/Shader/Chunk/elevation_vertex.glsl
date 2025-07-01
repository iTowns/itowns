#if NUM_VS_TEXTURES > 0
    if(elevationTextureCount > 0) {
        float elevation = getElevation(uv, elevationTextures, elevationOffsetScales[0], elevationLayers[0]);
        transformed += elevation * normal;
    }
#endif
