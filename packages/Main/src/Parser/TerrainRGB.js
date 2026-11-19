import { MathUtils, RGBAFormat, UnsignedByteType } from 'three';
import { sharedReadContext2D } from 'Utils/CanvasUtils';

const imagePixels = new WeakMap();
const MIN_ELEVATION = -10000;
const MAX_ELEVATION = MIN_ELEVATION + 0xffffff * 0.1;

export function decodeTerrainRGB(data, index) {
    return MIN_ELEVATION + (data[index] * 65536 + data[index + 1] * 256 + data[index + 2]) * 0.1;
}

function pixelsForTexture(texture) {
    const image = texture.image;
    if (image.data) {
        if (texture.format !== RGBAFormat || texture.type !== UnsignedByteType ||
            image.data.length !== image.width * image.height * 4) {
            throw new Error('Terrain-RGB data textures must contain 8-bit RGBA pixels');
        }
        return image.data;
    }

    const cached = imagePixels.get(texture);
    if (cached && cached.image === image && cached.version === texture.version) {
        return cached.data;
    }
    const ctx = sharedReadContext2D();
    ctx.canvas.width = image.width;
    ctx.canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height).data;
    imagePixels.set(texture, { image, version: texture.version, data });
    return data;
}

export function computeTerrainRGBMinMax(texture, pitch, zmin = -Infinity, zmax = Infinity) {
    const { width, height } = texture.image;
    const data = pixelsForTexture(texture);
    // Include neighboring texels used by linear filtering at the child tile's boundaries.
    const minX = MathUtils.clamp(Math.floor(pitch.x * width - 0.5), 0, width - 1);
    const maxX = MathUtils.clamp(Math.ceil((pitch.x + pitch.z) * width - 0.5), 0, width - 1);
    const minY = MathUtils.clamp(Math.floor(pitch.y * height - 0.5), 0, height - 1);
    const maxY = MathUtils.clamp(Math.ceil((pitch.y + pitch.w) * height - 0.5), 0, height - 1);
    let min = Infinity;
    let max = -Infinity;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const index = 4 * (y * width + x);
            // Canvas readback can alter RGB values of transparent image pixels.
            if (!texture.image.data && data[index + 3] !== 255) {
                return {
                    min: MathUtils.clamp(MIN_ELEVATION, zmin, zmax),
                    max: MathUtils.clamp(MAX_ELEVATION, zmin, zmax),
                };
            }
            const value = decodeTerrainRGB(data, index);
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    }
    // Account for single-precision shader arithmetic when decoding interpolated channels.
    return { min: MathUtils.clamp(min - 0.5, zmin, zmax), max: MathUtils.clamp(max + 0.5, zmin, zmax) };
}
