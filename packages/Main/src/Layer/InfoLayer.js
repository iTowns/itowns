import { Extent } from '@itowns/geographic';

export default class InfoLayer {
    constructor(layer) {
        this.layer = layer;
    }
    clear() {}
    update() {}
}


/**
 * InfoTiledGeometryLayer that provides some states layer informations. These
 * informations are displayed tiles, displayed {@link ColorLayer} and {@link
 * ElevationLayer} and extent of displayed tiles.
 *
 * @class InfoTiledGeometryLayer
 *
 * @property {object} displayed
 * @property {Layer[]} displayed.layers - Displayed {@link ColorLayer} and {@link ElevationLayer}.
 * @property {Extent} displayed.extent - {@link Extent} of displayed tiles.
 * @property {Set} displayed.tiles - Set of displayed tiles.
 */
export class InfoTiledGeometryLayer extends InfoLayer {
    constructor(tiledGeometryLayer) {
        super(tiledGeometryLayer);
        this.displayed = { tiles: new Set() };
        Object.defineProperty(
            this.displayed,
            'layers',
            {
                get: () => {
                    let layers = [];
                    this.displayed.tiles.forEach((tile) => {
                        const m = tile.material;
                        const displayedColorLayers = m.colorTileIds.filter(id => m.getColorTile(id)?.level > -1);

                        const elevationlayers = m.elevationTiles.filter(rt => rt.visible && rt.level >= rt.layer.source.zoom.min);
                        elevationlayers.sort((a, b) => b.level - a.level).splice(1);
                        layers = [...new Set([
                            ...layers,
                            ...displayedColorLayers,
                            ...elevationlayers.map(l => l.id)])];
                    });

                    return this.layer.attachedLayers.filter(l => layers.includes(l.id));
                },
            });
        Object.defineProperty(
            this.displayed,
            'extent',
            {
                get: () => {
                    const extent = new Extent(this.layer.extent.crs, Infinity, -Infinity, Infinity, -Infinity);
                    extent.min = +Infinity;
                    extent.max = -Infinity;
                    this.displayed.tiles.forEach((tile) => {
                        extent.union(tile.extent);
                        extent.min = Math.min(tile.obb.z.min, extent.min);
                        extent.max = Math.max(tile.obb.z.max, extent.max);
                    });

                    return extent;
                },
            });
    }

    clear() {
        this.displayed.tiles.clear();
    }

    update(tile) {
        if (tile.material.visible) {
            this.displayed.tiles.add(tile);
        } else {
            this.displayed.tiles.delete(tile);
        }
    }
}
