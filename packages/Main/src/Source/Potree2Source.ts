import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import Potree2BinParser from 'Parser/Potree2BinParser';
import { PointAttribute,
    Potree2PointAttributes, PointAttributeTypes } from 'Core/Potree2PointAttributes';

interface Potree2Attribute {
    name: string;
    description: string;
    size: number;
    numElements: number;
    elementSize: number;
    type: keyof typeof typeNameAttributeMap;
    min: number[];
    max: number[];
}

interface Potree2Metadata {
    version: string;
    name: string;
    description: string;
    points: number;
    projection: string;
    hierarchy: {
        firstChunkSize: number;
        stepSize: number;
        depth: number;
    };
    offset: [number, number, number];
    scale: [number, number, number];
    spacing: number;
    boundingBox: {
        min: [number, number, number];
        max: [number, number, number];
    };
    encoding: 'BROTLI' | 'DEFAULT';
    attributes: Potree2Attribute[];
}

interface Potree2SourceParameters {
    /** folder url */
    url: string;
    /** metadata file name */
    file: string;
    crs: string;
    metadata?: Potree2Metadata;
    networkOptions?: RequestInit;
}

const typeNameAttributeMap = {
    double: PointAttributeTypes.DATA_TYPE_DOUBLE,
    float: PointAttributeTypes.DATA_TYPE_FLOAT,
    int8: PointAttributeTypes.DATA_TYPE_INT8,
    uint8: PointAttributeTypes.DATA_TYPE_UINT8,
    int16: PointAttributeTypes.DATA_TYPE_INT16,
    uint16: PointAttributeTypes.DATA_TYPE_UINT16,
    int32: PointAttributeTypes.DATA_TYPE_INT32,
    uint32: PointAttributeTypes.DATA_TYPE_UINT32,
    int64: PointAttributeTypes.DATA_TYPE_INT64,
    uint64: PointAttributeTypes.DATA_TYPE_UINT64,
} as const;

function parseAttributes(jsonAttributes: Potree2Metadata['attributes']): Potree2PointAttributes {
    const attributes = new Potree2PointAttributes();

    const replacements : Record<string, string> = {
        rgb: 'rgba',
    };

    for (const jsonAttribute of jsonAttributes) {
        const { name, numElements, min, max } = jsonAttribute;

        const type = typeNameAttributeMap[jsonAttribute.type];

        const potreeAttributeName = replacements[name] ? replacements[name] : name;

        const attribute = new PointAttribute(potreeAttributeName, type, numElements);

        if (numElements === 1) {
            attribute.range = [min[0], max[0]];
        } else {
            // @ts-expect-error PointAttribute.range is not typed
            attribute.range = [min, max];
        }

        if (name === 'gps-time') {
            // HACK: Guard against bad gpsTime range in metadata,
            // see potree/potree#909.
            if (attribute.range[0] === attribute.range[1]) {
                attribute.range[1] += 1;
            }
        }

        // @ts-expect-error PointAttribute.initialRange is not typed
        attribute.initialRange = attribute.range;

        attributes.add(attribute);
    }

    {
        // check if it has normals
        const hasNormals =
            attributes.attributes.find(a => a.name === 'NormalX') !== undefined &&
            attributes.attributes.find(a => a.name === 'NormalY') !== undefined &&
            attributes.attributes.find(a => a.name === 'NormalZ') !== undefined;

        if (hasNormals) {
            const vector = {
                name: 'NORMAL',
                attributes: ['NormalX', 'NormalY', 'NormalZ'],
            };
            attributes.addVector(vector);
        }
    }

    return attributes;
}
/**
 * Potree2Source are object containing informations on how to fetch
 * potree 2.0 points cloud resources.
 */

class Potree2Source extends Source {
    file: string;
    extension: 'bin';

    // Properties initialized after fetching metadata
    metadata!: Potree2Metadata;
    pointAttributes!: Potree2PointAttributes;
    baseurl!: string;
    zmin!: number;
    zmax!: number;
    spacing!: number;

    /**
     * @param source - An object that can contain all properties of a
     * Potree2Source
     *
     * This `metadata` file stores information about the potree cloud 2.0
     * in JSON format.
     * The structure is :
     * * __`version`__ - The metadata.json format may change over time.
     * The version number is necessary so that parsers know how to interpret
     * the data.
     * * __`name`__ - Point cloud name.
     * * __`description`__ - Point cloud description.
     * * __`points`__ - Total number of points.
     * * __`projection`__ - Point cloud geographic projection system.
     * * __`hierarchy`__ - Information about point cloud hierarchy
     *          (first chunk size, step size, octree depth).
     * * __`offset`__ - Position offset used to determine the global
     *          point position.
     * * __`scale`__ - Point cloud scale.
     * * __`spacing`__ - The minimum distance between points at root level.
     * * __`boundingBox`__ - Contains the minimum and maximum of the axis
     *          aligned bounding box. This bounding box is cubic and aligned
     *          to fit to the octree root.
     * * __`encoding`__ - Encoding type: BROTLI or DEFAULT (uncompressed).
     * * __`attributes`__ - Array of attributes (position,  intensity,
     *          return number, number of returns, classification,
     *          scan angle rank, user data, point source id, gps-time, rgb).
     * ```
     * {
     *     version: '2.0',
     *     name: "sample",
     *     description: "",
     *     points: 534909153,
     *     projection: "",
     *     hierarchy: {
     *         firstChunkSize: 1276,
     *         stepSize: 4,
     *         depth: 16
     *     },
     *     offset: [1339072.07, 7238866.339, 85.281],
     *     scale: [0.001, 0.001, 0.002],
     *     spacing: 24.476062500005355,
     *     boundingBox: {
     *         min: [1339072.07, 7238866.339, 85.281],
     *         max: [1342205.0060000008, 7241999.275, 3218.2170000006854]
     *     },
     *     encoding: "BROTLI",
     *     attributes: [
     *          {
     *              name: "position",
     *              description: "",
     *              size: 12,
     *              numElements: 3,
     *              elementSize: 4,
     *              type: "int32",
     *              min: [-0.74821299314498, -2.7804059982299, 2.5478212833404],
     *              max: [2.4514148223438, 1.4893437627414, 7.1957106576508]
     *          },
     *          {
     *              name: "intensity",
     *              description: "",
     *              size: 2,
     *              numElements: 1,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "return number",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "number of returns",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "classification",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "scan angle rank",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "user data",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "point source id",
     *              description: "",
     *              size: 2,
     *              numElements: 1,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "gps-time",
     *              description: "",
     *              size: 8,
     *              numElements: 1,
     *              elementSize: 8,
     *              type: "double",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "rgb",
     *              description: "",
     *              size: 6,
     *              numElements: 3,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [5632, 5376, 4864],
     *              max: [65280, 65280, 65280]
     *          }
     *     ]
     * }
     * ```
     */
    constructor(source: Potree2SourceParameters) {
        if (!source.file) {
            throw new Error('New Potree2Source: file is required');
        }
        if (!source.crs) {
            // with better data and the spec this might be removed
            throw new Error('New PotreeSource: crs is required');
        }

        super(source);
        this.file = source.file;
        this.fetcher = Fetcher.arrayBuffer;
        this.parser = Potree2BinParser.parse;
        this.extension = 'bin';

        this.whenReady = (source.metadata ?
            Promise.resolve(source.metadata) :
            Fetcher.json(`${this.url}/${this.file}`,
                this.networkOptions) as Promise<Potree2Metadata>)
            .then((metadata) => {
                this.metadata = metadata;
                this.pointAttributes = parseAttributes(metadata.attributes);
                this.baseurl = `${this.url}`;

                this.zmin = metadata.attributes
                    .filter(attributes => attributes.name === 'position')[0].min[2];
                this.zmax = metadata.attributes
                    .filter(attributes => attributes.name === 'position')[0].max[2];

                this.spacing = metadata.spacing;

                return metadata;
            });
    }
}

export default Potree2Source;
