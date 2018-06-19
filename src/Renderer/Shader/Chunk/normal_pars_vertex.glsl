// see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602
// and implementation in PotreeConverter (BINPointReader.cpp) and potree (BinaryDecoderWorker.js)
#if defined(NORMAL_OCT16)

attribute vec2 oct16Normal;
vec3 decodeOct16Normal(vec2 encodedNormal) {
    vec2 nNorm = 2. * (encodedNormal / 255.) - 1.;
    vec3 n;
    n.z = 1. - abs(nNorm.x) - abs(nNorm.y);
    if (n.z >= 0.) {
        n.x = nNorm.x;
        n.y = nNorm.y;
    } else {
        n.x = sign(nNorm.x) - sign(nNorm.x) * sign(nNorm.y) * nNorm.y;
        n.y = sign(nNorm.y) - sign(nNorm.y) * sign(nNorm.x) * nNorm.x;
    }
    return normalize(n);
}

#elif defined(NORMAL_SPHEREMAPPED)

attribute vec2 sphereMappedNormal;
// see http://aras-p.info/texts/CompactNormalStorage.html method #4
// or see potree's implementation in BINPointReader.cpp
vec3 decodeSphereMappedNormal(vec2 encodedNormal) {
    vec2 fenc = 2. * encodedNormal / 255. - 1.;
    float f = dot(fenc,fenc);
    float g = 2. * sqrt(1. - f);
    vec3 n;
    n.xy = fenc * g;
    n.z = 1. - 2. * f;
    return n;
}

#elif defined(NORMAL)

attribute vec3 normal;

#endif
