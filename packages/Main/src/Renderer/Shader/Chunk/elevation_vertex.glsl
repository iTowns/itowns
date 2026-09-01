#if USE_DISPLACEMENTMAP
        float elevation = getElevation(elevationLayer);
        transformed += elevation * normal;
#endif
