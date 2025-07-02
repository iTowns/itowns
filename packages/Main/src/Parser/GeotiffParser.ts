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
        case 2:
            // TODO: implement
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


class GeotiffNode {
    image: GeoTIFFImage;
    width: number;
    height: number;
    resolution: Array<number>;
    origin: Array<number>;
    dataType: TextureDataType;

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
    }

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
            resampleMethod,
            pool,
        } = options;

        let typedArray = await this.#readImage({
            window: imageWindow,
            outputWidth: textureDimensions.x,
            outputHeight: textureDimensions.y,
            resampleMethod,
            pool,
        });

        const samplesPerPixel = this.image.getSamplesPerPixel();
        // If TypedArray is an RGB buffer, convert it to RGBA.
        if (samplesPerPixel === 3) {
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
            selectFormat(samplesPerPixel),
            this.dataType,
        );

        texture.flipY = true;
        texture.needsUpdate = true;


        return texture;
    }

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

    async #readImage(
        options: {
            window?: Array<number>,
            outputWidth: number,
            outputHeight: number,
            resampleMethod?: string,
            pool?: Pool,
        },
    ): Promise<TypedArrayWithDimensions> {
        const {
            window,
            outputWidth,
            outputHeight,
            resampleMethod = 'nearest',
            pool,
        } = options;

        try {
            return <TypedArrayWithDimensions> await this.image.readRasters({
                window,
                pool,
                width: outputWidth,
                height: outputHeight,
                resampleMethod,
                interleave: true,
            });
        // TODO: Do we still need to catch this error?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString() === 'AggregateError: Request failed') {
                await new Promise((resolve) => {
                    setTimeout(resolve, 100);
                });
                return this.#readImage(options);
            }
            throw error;
        }
    }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parse(data: any, options: any) {
    const image = data;
    const {
        in: {
            crs,
            defaultAlpha,
            resampleMethod,
        },
        extent,
    } = options;

    const tileExtent = extent.isExtent ? extent.as(crs) : extent.toExtent(crs);
    const tileWorldDimensions = tileExtent.planarDimensions();
    const tileRasterDimensions = new Vector2(
        255,
        Math.round(255 * tileWorldDimensions.y / tileWorldDimensions.x),
    );

    const geotiffNode = new GeotiffNode({ image });

    const texture = <TextureWithExtent> await geotiffNode.extractTexture({
        // No texture extent is passed. We assume the image covers the tile as
        // it is the case with all other raster format.
        textureDimensions: tileRasterDimensions,
        resampleMethod,
        defaultAlpha,
        // TODO: find a way to add pool
    });
    texture.extent = extent;

    return texture;
}


export default { parse };


export {
    GeotiffNode,
    selectDataType,
};

