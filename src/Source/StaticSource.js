import flatbush from 'flatbush';
import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import Extent from 'Core/Geographic/Extent';

function _selectImagesFromSpatialIndex(index, images, extent) {
    return index.search(
        extent.west(), extent.south(),
        extent.east(), extent.north()).map(i => images[i]);
}

function buildUrl(layer, image) {
    return layer.url.href.substr(0, layer.url.href.lastIndexOf('/') + 1)
        + image;
}

/**
 * @deprecated
 *
 * This source is going to be removed after 2.7.0, along with PanoramaLayer and
 * PanoramaView.
 *
 * See https://github.com/iTowns/itowns/issues/739
 * See https://github.com/iTowns/itowns/issues/901
 */
class StaticSource extends Source {
    /**
     * Images source to panorama layer {@link PanoramaLayer}
     *
     * @constructor
     * @extends Source
     * @param {sourceParams}  source  The source
     * @param {string}  source.extent It's extent of panoramic's images
    */
    constructor(source) {
        console.warn('Deprecation warning: this source is going to be removed in iTowns 2.7.0, please consider stop using it.');
        if (!source.extent) {
            throw new Error('layer.extent is required');
        }
        super(source);

        this.isStaticSource = true;
        this.zoom = { min: 0, max: 3 };
        this.url = new URL(source.url, window.location);
        this.whenReady = Fetcher.json(this.url.href).then((metadata) => {
            this.images = [];
            // eslint-disable-next-line guard-for-in
            for (const image in metadata) {
                const extent = new Extent(this.projection, ...metadata[image]);
                this.images.push({
                    image,
                    extent,
                });
            }
            if (!this.images.length) {
                return;
            }
            this._spatialIndex = new flatbush(this.images.length);
            for (const image of this.images) {
                this._spatialIndex.add(
                    image.extent.west(),
                    image.extent.south(),
                    image.extent.east(),
                    image.extent.north());
            }
            this._spatialIndex.finish();
        }).then(() => {
            if (!this.format) {
                // fetch the first image to detect format
                if (this.images.length) {
                    const url = buildUrl(this, this.images[0].image);
                    return fetch(url, this.networkOptions).then((response) => {
                        this.format = response.headers.get('Content-type');
                        if (this.format === 'application/octet-stream') {
                            this.format = 'image/x-bil';
                        }
                        if (!this.format) {
                            throw new Error(`${this.name}: could not detect layer format, please configure 'layer.format'.`);
                        }
                    });
                }
            }
        });
    }

    urlFromExtent(extent) {
        const selection = this.getSourceExtents(extent);
        return this.url.href.substr(0, this.url.href.lastIndexOf('/') + 1) + selection.image;
    }

    handlingError(err, url) {
        console.error(`Source static: ${this.url}, ${err.response.status} error while trying to fetch data. Url was ${url}.`, err);
    }

    canTileTextureBeImproved(extent, texture) {
        if (!this.images) {
            return false;
        }
        const s = this.getSourceExtents(extent);

        if (!s) {
            return false;
        }
        if (!texture || !texture.image) {
            return true;
        }

        const urlTexture = texture.image.currentSrc;
        const urlSource = this.url.href.substr(0, this.url.href.lastIndexOf('/') + 1) + s.image;
        const canBeImproved = urlSource != urlTexture;
        return canBeImproved;
    }

    getSourceExtents(extent) {
        // select the smallest image entirely covering the tile
        extent = extent.crs() === this.extent.crs() ? extent : extent.as(this.extent.crs());
        const candidates =
        _selectImagesFromSpatialIndex(
            this._spatialIndex, this.images, extent);

        let selection;
        for (const entry of candidates) {
            if (extent.isInside(entry.extent)) {
                if (!selection) {
                    selection = entry;
                } else {
                    const d = selection.extent.dimensions();
                    const e = entry.extent.dimensions();
                    if (e.x <= d.x && e.y <= d.y) {
                        selection = entry;
                    }
                }
            }
        }
        return selection;
    }

    extentInsideLimit(extent) {
        return extent.intersectsExtent(this.extent);
    }
}

export default StaticSource;
