#if defined(NORMAL_OCT16)
        vec3 normal = decodeOct16Normal(oct16Normal);
#elif defined(NORMAL_SPHEREMAPPED)
        vec3 normal = decodeSphereMappedNormal(sphereMappedNormal);
#elif !defined(NORMAL)
        // default to vertical
        vec3 normal = vec3(0., 0., 1.);
#endif
