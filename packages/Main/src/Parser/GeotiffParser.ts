import {
    DataTexture,
    ByteType,
    FloatType,
    HalfFloatType,
    IntType,
    ShortType,
    UnsignedByteType,
    UnsignedIntType,
    UnsignedShortType,
    RGBAFormat,
    RedFormat,
    Vector2,
} from 'three';

import { TEXTURE_TILE_DIM } from 'Provider/Fetcher';

import type { TextureDataType } from 'three';
import type { Extent } from '@itowns/geographic';
import type {
    TypedArrayWithDimensions,
    Pool,
    GeoTIFFImage,
} from 'geotiff';


export type TextureWithExtent = DataTexture & { extent: Extent }


function selectDataType(format: number, bitsPerSample: number) {
    switch (format) {
        case 1:  // unsigned integer data
            if (bitsPerSample <= 8) {
                return UnsignedByteType;
            } else if (bitsPerSample <= 16) {
                return UnsignedShortType;
            } else if (bitsPerSample <= 32) {
                return UnsignedIntType;
            }
            break;
        case 2:  // two's complement signed integer data
            if (bitsPerSample <= 8) {
                return ByteType;
            } else if (bitsPerSample <= 16) {
                return ShortType;
            } else if (bitsPerSample <= 32) {
                return IntType;
            }
            break;
        case 3:  // IEEE floating point data
            if (bitsPerSample <= 16) {
                return HalfFloatType;
            } else if (bitsPerSample <= 32) {
                return FloatType;
            }  // Double precision float is not supported
            break;
        default:
            break;
    }
    throw Error('Unsuported data format/bitsPerSample combination');
}


function selectFormat(samplesPerPixel: number) {
    switch (samplesPerPixel) {
        case 1:
            return RedFormat;
            break;
        case 3:
        case 4:
            return RGBAFormat;
            break;
        default:
            break;
    }
    throw Error(`GeoTIFF images with ${samplesPerPixel} samples are not supported yet.`);
}


function rgbArrayToRGBAArray(
    typedArray: TypedArrayWithDimensions,
    dataType: number,
    alpha: number,
) {
    const { width, height } = typedArray;
    const newBufferLength = width * height * 4;

    const newBufferConstructor = Object.getPrototypeOf(typedArray).constructor;
    const newBuffer = <TypedArrayWithDimensions> new newBufferConstructor(newBufferLength);

    let newAlpha;
    switch (dataType) {
        case UnsignedByteType:
            newAlpha = alpha;
            break;
        case FloatType:
            newAlpha = alpha / 255;
            break;
        case UnsignedShortType:
        case UnsignedIntType:
        case ByteType:
        case ShortType:
        case IntType:
        case HalfFloatType:
        default:
            throw new Error('unsupported data type');
    }

    newBuffer.width = width;
    newBuffer.height = height;

    for (let i = 0; i < width * height; i++) {
        const oldIndex = i * 3;
        const index = i * 4;
        // Copy RGB from original arrayBuffer
        newBuffer[index + 0] = typedArray[oldIndex + 0];  // R
        newBuffer[index + 1] = typedArray[oldIndex + 1];  // G
        newBuffer[index + 2] = typedArray[oldIndex + 2];  // B
        // Add alpha to new arrayBuffer
        newBuffer[index + 3] = newAlpha;
    }

    return newBuffer;
}


/**
 * A node that stores information about an image in a GeoTIFF File and accessors
 * to retrieve actual image data.
 *
 * It is basicaly a wrapper around
 * [GeoTIFFImage](https://geotiffjs.github.io/geotiff.js/module-geotiffimage-GeoTIFFImage.html).
 */
class GeotiffNode {
    /**
     * A GeoTIFFImage instance for the image.
     */
    image: GeoTIFFImage;
    /**
     * The width of the image, in pixel.
     */
    width: number;
    /**
     * The height of the image, in pixel.
     */
    height: number;
    /**
     * The resolution of the image, in distance per pixel. The resolution is
     * stored in a array containing in order the horizontal resolution and the
     * vertical resolution.
     */
    resolution: Array<number>;
    /**
     * The coordinates of the top-left corner of the image, expressed in the
     * GeoTIFF data CRS.
     */
    origin: Array<number>;

    /**
     * The Three.js TextureDataType that matches the format of the image.
     */
    dataType: TextureDataType;

    /**
     * The number of bands in the image (4 for RGBA, 3 for RGB...)
     */
    samplesPerPixel: number;

    constructor(
        config:{
            image: GeoTIFFImage,
            resolution?: Array<number>,
            origin?: Array<number>,
            dataType?: TextureDataType,
        },
    ) {
        const {
            image,
            resolution = image.getResolution(),
            origin = image.getOrigin(),
            dataType = selectDataType(image.getSampleFormat(), image.getBitsPerSample()),
        } = config;

        this.image = image;
        this.resolution = resolution;
        this.origin = origin;
        this.dataType = dataType;

        this.width = image.getWidth();
        this.height = image.getHeight();

        this.samplesPerPixel = image.getSamplesPerPixel();
    }

    private get reader() {
        return this.samplesPerPixel === 3
            ? this.image.readRGB.bind(this.image)
            : this.image.readRasters.bind(this.image);
    }

    /**
     * Extract a portion of the image into a Three.js Texture. The portion is
     * delimited by a window. This window is a set of four boundaries (Xmin,
     * Ymin, Xmax, Ymax) expressed in the image pixel space.
     */
    async extractTexture(
        options: {
            imageWindow?: Array<number>,
            textureDimensions: Vector2,
            resampleMethod?: string,
            defaultAlpha?: number,
            pool?: Pool,
        },
    ): Promise<DataTexture> {
        const {
            imageWindow,
            textureDimensions,
            defaultAlpha = 255,
            resampleMethod = 'nearest',
            pool,
        } = options;

        let typedArray = <TypedArrayWithDimensions> await this.reader({
            window: imageWindow,
            pool,
            width: textureDimensions.x,
            height: textureDimensions.y,
            resampleMethod,
            interleave: true,
        });

        // If TypedArray is an RGB buffer, convert it to RGBA.
        if (this.samplesPerPixel === 3) {
            typedArray = rgbArrayToRGBAArray(
                typedArray,
                this.dataType,
                defaultAlpha,
            );
        }

        const texture = new DataTexture(
            typedArray,
            typedArray.width,
            typedArray.height,
            selectFormat(this.samplesPerPixel),
            this.dataType,
        );

        texture.flipY = true;
        texture.needsUpdate = true;


        return texture;
    }

    /**
     * Converts an extent expressed in the GeoTIFF data CRS to an image window,
     * so the same extent expressed in the image pixel space.
     */
    extentToImageWindow(extent: Extent) {
        const [oX, oY] = this.origin;
        const [resX, resY] = this.resolution;

        const wnd = [
            Math.round((extent.west - oX) / resX),
            Math.round((extent.north - oY) / resY),
            Math.round((extent.east - oX) / resX),
            Math.round((extent.south - oY) / resY),
        ];

        const xMin = Math.min(wnd[0], wnd[2]);
        let xMax = Math.max(wnd[0], wnd[2]);
        const yMin = Math.min(wnd[1], wnd[3]);
        let yMax = Math.max(wnd[1], wnd[3]);

        // prevent zero-sized requests
        if ((xMax - xMin) === 0) { xMax += 1; }
        if ((yMax - yMin) === 0) { yMax += 1; }

        return [xMin, yMin, xMax, yMax];
    }
}


/**
 * Parse a GeoTIFFImage object read from a GeoTIFF file and returns a Three.js
 * Texture.
 *
 * At the moment, iTowns only displays data either as single band or RGBA
 * textures. Therefore, a GeoTIFF image with a number of samples other than 1,
 * 2 or 3 won't be displayed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parse(data: GeoTIFFImage, options: any) {
    const image = data;
    const {
        in: {
            defaultAlpha,
            resampleMethod,
        },
        extent,
    } = options;

    const tileRasterDimensions = new Vector2(TEXTURE_TILE_DIM, TEXTURE_TILE_DIM);

    const geotiffNode = new GeotiffNode({ image });

    const texture = <TextureWithExtent> await geotiffNode.extractTexture({
        // No texture extent is passed. We assume the image covers the tile as
        // it is the case with all other raster format.
        textureDimensions: tileRasterDimensions,
        resampleMethod,
        defaultAlpha,
    });
    texture.extent = extent;

    return texture;
}


export default { parse };


export {
    GeotiffNode,
    selectDataType,
};

