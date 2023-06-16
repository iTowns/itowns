export function lab2rgb(lab) {
    let y = (lab[0] + 16) / 116;
    let x = lab[1] / 500 + y;
    let z = y - lab[2] / 200;
    let r; let g; let
        b;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

    r = x *  3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y *  1.8758 + z *  0.0415;
    b = x *  0.0557 + y * -0.2040 + z *  1.0570;

    r = (r > 0.0031308) ? (1.055 * r ** (1 / 2.4) - 0.055) : 12.92 * r;
    g = (g > 0.0031308) ? (1.055 * g ** (1 / 2.4) - 0.055) : 12.92 * g;
    b = (b > 0.0031308) ? (1.055 * b ** (1 / 2.4) - 0.055) : 12.92 * b;

    return [Math.max(0, Math.min(1, r)) * 255,
        Math.max(0, Math.min(1, g)) * 255,
        Math.max(0, Math.min(1, b)) * 255];
}


export function rgb2lab(rgb) {
    let r = rgb.r || rgb[0] / 255;
    let g = rgb.g || rgb[1] / 255;
    let b = rgb.b || rgb[2] / 255;
    let x; let y; let
        z;

    r = (r > 0.04045) ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
    g = (g > 0.04045) ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
    b = (b > 0.04045) ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? x ** (1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? y ** (1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? z ** (1 / 3) : (7.787 * z) + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

// calculate the perceptual distance between colors in CIELAB
// https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs
export function deltaE(rgbA, rgbB) {
    const labA = rgb2lab(rgbA);
    const labB = rgb2lab(rgbB);
    const deltaL = labA[0] - labB[0];
    const deltaA = labA[1] - labB[1];
    const deltaB = labA[2] - labB[2];
    const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    const deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    const sc = 1.0 + 0.045 * c1;
    const sh = 1.0 + 0.015 * c1;
    const deltaLKlsl = deltaL / (1.0);
    const deltaCkcsc = deltaC / (sc);
    const deltaHkhsh = deltaH / (sh);
    const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}

