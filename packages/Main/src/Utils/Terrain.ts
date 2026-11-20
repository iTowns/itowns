import type { Coordinates } from '@itowns/geographic';
import type { Texture } from 'three';
import type TileMesh from 'Core/TileMesh';

/**
 * Result of an elevation picking, as returned by
 * {@link DEMUtils.getTerrainObjectAt}.
 *
 * @category Geographic
 */
export interface Terrain {
    /** Picked coordinate, with the elevation (in meters) in `coord.z`. */
    coord: Coordinates;
    /** The elevation texture where the `z` value has been read from. */
    texture: Texture;
    /** The picked tile, containing the texture. */
    tile: TileMesh;
}
