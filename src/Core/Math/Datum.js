/**
  * Datums; with associated ellipsoid, and Helmert transform parameters to convert from WGS 84 into
  * given datum.
  *
  * Note that precision of various datums will vary, and WGS-84 (original) is not defined to be
  * accurate to better than ±1 metre. No transformation should be assumed to be accurate to better
  * than a meter; for many datums somewhat less.
*/

import EllipsoidParameters from 'Core/Math/EllipsoidParameters';

var Datum = {
                    // transforms: t in metres, s in ppm, r in arcseconds       tx       ty        tz       s        rx       ry       rz
                    ED50:       { ellipsoid: EllipsoidParameters.Intl1924,      transform: [   89.5,    93.8,    123.1,    -1.2,     0.0,     0.0,     0.156  ] },
                    Irl1975:    { ellipsoid: EllipsoidParameters.AiryModified,  transform: [ -482.530, 130.596, -564.557,  -8.150,  -1.042,  -0.214,  -0.631  ] },
                    NAD27:      { ellipsoid: EllipsoidParameters.Clarke1866,    transform: [    8,    -160,     -176,       0,       0,       0,       0      ] },
                    NAD83:      { ellipsoid: EllipsoidParameters.GRS80,         transform: [    1.004,  -1.910,   -0.515,  -0.0015,  0.0267,  0.00034, 0.011  ] },
                    NTF:        { ellipsoid: EllipsoidParameters.Clarke1880IGN, transform: [  168,      60,     -320,       0,       0,       0,       0      ] },
                    OSGB36:     { ellipsoid: EllipsoidParameters.Airy1830,      transform: [ -446.448, 125.157, -542.060,  20.4894, -0.1502, -0.2470, -0.8421 ] },
                    Potsdam:    { ellipsoid: EllipsoidParameters.Bessel1841,    transform: [ -582,    -105,     -414,      -8.3,     1.04,    0.35,   -3.08   ] },
                    TokyoJapan: { ellipsoid: EllipsoidParameters.Bessel1841,    transform: [  148,    -507,     -685,       0,       0,       0,       0      ] },
                    WGS72:      { ellipsoid: EllipsoidParameters.WGS72,         transform: [    0,       0,     -4.5,      -0.22,    0,       0,       0.554  ] },
                    WGS84:      { ellipsoid: EllipsoidParameters.WGS84,         transform: [    0.0,     0.0,      0.0,     0.0,     0.0,     0.0,     0.0    ] }
};

export default Datum;

