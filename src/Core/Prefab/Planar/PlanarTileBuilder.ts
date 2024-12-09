import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import {
    ShareableExtent,
    TileBuilder,
    TileBuilderParams,
} from '../TileBuilder';

const quaternion = new THREE.Quaternion();
const center = new THREE.Vector3();

type Transform = {
    coords: Coordinates,
    position: THREE.Vector3,
    normal: THREE.Vector3,
};

/** Specialized parameters for the [PlanarTileBuilder]. */
export interface PlanarTileBuilderParams extends TileBuilderParams {
    crs: string;
    uvCount?: number;
    nbRow: number;
}

/**
 * TileBuilder implementation for the purpose of generating planar
 * tile arrangements.
 */
export class PlanarTileBuilder implements TileBuilder<PlanarTileBuilderParams> {
    private _uvCount: number;
    private _transform: Transform;
    private _crs: string;

    public constructor(options: {
        projection?: string,
        crs: string,
        uvCount?: number,
    }) {
        if (options.projection) {
            console.warn('PlanarTileBuilder projection parameter is deprecated,'
                + ' use crs instead.');
            options.crs ??= options.projection;
        }

        this._crs = options.crs;

        this._transform = {
            coords: new Coordinates('EPSG:4326', 0, 0),
            position: new THREE.Vector3(),
            normal: new THREE.Vector3(0, 0, 1),
        };

        this._uvCount = options.uvCount ?? 1;
    }

    public get uvCount(): number {
        return this._uvCount;
    }

    public get crs(): string {
        return this._crs;
    }

    public prepare(params: TileBuilderParams): PlanarTileBuilderParams {
        const newParams = params as PlanarTileBuilderParams;
        newParams.nbRow = 2 ** (params.level + 1.0);
        newParams.coordinates = new Coordinates(this.crs);
        return newParams;
    }

    public center(extent: Extent): THREE.Vector3 {
        extent.center(this._transform.coords);
        center.set(this._transform.coords.x, this._transform.coords.y, 0);
        return center;
    }

    public vertexPosition(coordinates: Coordinates): THREE.Vector3 {
        this._transform.position.set(coordinates.x, coordinates.y, 0);
        return this._transform.position;
    }

    public vertexNormal(): THREE.Vector3 {
        return this._transform.normal;
    }

    public uProject(u: number, extent: Extent): number {
        return extent.west + u * (extent.east - extent.west);
    }

    public vProject(v: number, extent: Extent): number {
        return extent.south + v * (extent.north - extent.south);
    }

    public computeShareableExtent(extent: Extent): ShareableExtent {
        // compute shareable extent to pool the geometries
        // the geometry in common extent is identical to the existing input
        // with a translation
        return {
            shareableExtent: new Extent(extent.crs, {
                west: 0,
                east: Math.abs(extent.west - extent.east),
                south: 0,
                north: Math.abs(extent.north - extent.south),
            }),
            quaternion,
            position: this.center(extent).clone(),
        };
    }
}
