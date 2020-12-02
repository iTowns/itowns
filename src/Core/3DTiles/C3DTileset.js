import * as THREE from 'three';
import C3DTBoundingVolume from './C3DTBoundingVolume';
import C3DTilesTypes from './C3DTilesTypes';

const inverseTileTransform = new THREE.Matrix4();

/** @classdesc
 * A 3D Tiles
 *  [Tileset](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/schema/tileset.schema.json).
 * @property {C3DTilesTypes} type - Used by 3D Tiles extensions
 * (e.g. {@link C3DTBatchTableHierarchyExtension}) to know in which context
 * (i.e. for which 3D Tiles class) the parsing of the extension should be done.
 *  @property {object} asset - Generic information about the tileset, see
 *  [asset specification]https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/asset.schema.json
 *  @property {object} properties - Properties associated with the tileset, see
 *  [tileset specification](https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tileset.schema.json#L11)
 *  @property {number} geometricError - see [tileset
 *  specification](https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tileset.schema.json#L18)
 *  @property {string[]} extensionsUsed - see [tileset
 *  specification](https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tileset.schema.json#L27)
 *  @property {array} extensionsRequired - see [tileset specification](https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tileset.schema.json#L36)
 *  @property {object[]} tiles - an array holding all the
 *  [tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/schema/tile.schema.json)
 *  (not their content which is stored in the attribute object3d of the
 *  layer). This list represents a flattened tileset.
 *  @property {object} extensions - Extensions of the tileset in the form:
 * {extensioName1: extensionObject1, extensioName2: extensionObject2, ...}
 */
class C3DTileset {
    constructor(json, baseURL, registeredExtensions) {
        this.type = C3DTilesTypes.tileset;

        this.asset = json.asset;
        this.properties = json.properties;
        this.geometricError = json.geometricError;
        this.extensionsUsed = json.extensionsUsed;
        this.extensionsRequired = json.extensionsRequired;
        this.tiles = [];
        this.parseTiles(json.root, baseURL, undefined, registeredExtensions);

        if (json.extensions) {
            this.extensions =
                registeredExtensions.parseExtensions(json.extensions, this.type);
        }
    }

    /**
     * Recursion on the 3DTiles tileset (which is a tree) to parse the tiles
     * (nodes of the tree).
     * @param {object} tile - current tile
     * @param {string} baseURL - url of the source tileset and tiles
     * @param {object} parent - parent tile (used for computing the transform
     * matrix from local to global coordinates)
     * @param {object} registeredExtensions - 3D Tiles extensions registered
     * in the C3DTilesLayer (see {@link C3DTExtensions}
     */
    parseTiles(tile, baseURL, parent, registeredExtensions) {
        // compute transform (will become Object3D.matrix when the object is
        // downloaded)
        tile.transform =
            tile.transform ? (new THREE.Matrix4()).fromArray(tile.transform) :
                undefined;

        // The only reason to store _worldFromLocalTransform is because of
        // extendTileset where we need the transform chain for one tile.
        tile._worldFromLocalTransform = tile.transform;
        if (parent && parent._worldFromLocalTransform) {
            if (tile.transform) {
                tile._worldFromLocalTransform =
                    new THREE.Matrix4().multiplyMatrices(
                        parent._worldFromLocalTransform, tile.transform);
            } else {
                tile._worldFromLocalTransform = parent._worldFromLocalTransform;
            }
        }

        // inverseTileTransform is only used for volume.region
        if ((tile.viewerRequestVolume && tile.viewerRequestVolume.region)
            || (tile.boundingVolume && tile.boundingVolume.region)) {
            if (tile._worldFromLocalTransform) {
                inverseTileTransform.copy(tile._worldFromLocalTransform).invert();
            } else {
                inverseTileTransform.identity();
            }
        }

        tile.viewerRequestVolume = tile.viewerRequestVolume ?
            new C3DTBoundingVolume(tile.viewerRequestVolume,
                inverseTileTransform,
                registeredExtensions) : undefined;
        tile.boundingVolume = tile.boundingVolume ?
            new C3DTBoundingVolume(tile.boundingVolume,
                inverseTileTransform, registeredExtensions) : undefined;

        this.tiles.push(tile);
        tile.tileId = this.tiles.length - 1;
        tile.baseURL = baseURL;
        if (tile.children) {
            for (const child of tile.children) {
                this.parseTiles(child, baseURL, tile, registeredExtensions);
            }
        }
    }

    extendTileset(tileset, nodeId, baseURL, registeredExtensions) {
        this.parseTiles(tileset.root, baseURL, this.tiles[nodeId],
            registeredExtensions);
        this.tiles[nodeId].children = [tileset.root];
        this.tiles[nodeId].isTileset = true;
    }
}

export default C3DTileset;
