import { Vector3, Quaternion } from 'three';
import { FeatureGeometry, Feature } from 'Core/Feature';
import Extent from 'Core/Geographic/Extent';
import { constructors } from '../../Sia/Sia';

const itownsConstructors = [
    ...constructors,
    {
        constructor: Extent, // The custom class you want to support
        code: 2, // A unique positive code point for this class, the smaller the better
        args: item => [item.crs, item.west, item.east, item.south, item.north, item.row, item.col, item.zoom], // A function to serialize the instances of the class
        build(crs, west, east, south, north, row, col, zoom) { // A function for restoring instances of the class
            const extent = new Extent(crs, west || zoom, east || row, south || col, north);
            return extent;
        },
    },
    {
        constructor: Vector3,
        code: 3,
        args: item => [item.x, item.y, item.z],
        build(x, y, z) {
            return new Vector3(x, y, z);
        },
    },
    {
        constructor: Quaternion,
        code: 4,
        args: item => [item.x, item.y, item.z, item.w],
        build(x, y, z, w) {
            return new Quaternion(x, y, z, w);
        },
    },
    {
        constructor: FeatureGeometry,
        code: 5,
        args: item => [item.indices, item.properties, item.size, item.extent, item.altitude, item.verticePos],
        build(indices, properties, size, extent, altitude, verticePos) {
            const fg = new FeatureGeometry({ extent });
            fg.indices = indices;
            fg.properties = properties;
            fg.size = size;
            fg.altitude = altitude;
            fg.extent = extent;
            fg.verticePos = verticePos;
            return fg;
        },
    },
    {
        constructor: Feature,
        code: 6,
        args: item => [item.type, item.geometries, item.vertices, item.crs, item.size, item.normals, item.extent, item.altitude,
            item.hasExtraStyle,
        ],
        build(type, geometries, vertices, crs, size, normals, extent, altitude,
            hasExtraStyle,
        ) {
            const feature = new Feature(type, { transformToLocalSystem: () => {}, extent });
            feature.geometries = geometries;
            feature.vertices = vertices;
            feature.crs = crs;
            feature.size = size;
            feature.normals = normals;
            feature.extent = extent;
            feature.altitude = altitude;
            if (hasExtraStyle) { feature.hasExtraStyle = hasExtraStyle; }
            return feature;
        },
    },
];

export default itownsConstructors;
