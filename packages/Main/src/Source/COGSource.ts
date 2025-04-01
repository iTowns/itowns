import * as GeoTIFF from 'geotiff';
import Source from './Source';


// The idea is the following:
// - we load a tree structure when source is created ;
// - we provide a method to extract subimage from an extent, thus needing to
// find the right leaf in the tree structure ;
// - we plug this method to the parser.

class COGSource extends Source {
    zoom: {
        min: number,
        max: number,
    };
    pool: GeoTIFF.Pool;

    firstImage: GeoTIFF.GeoTIFFImage;

    constructor(source) {
        super(source);

        if (source.zoom) {
            this.zoom = source.zoom;
        } else {
            this.zoom = { min: 0, max: Infinity };
        }

        this.url = source.url;
        this.pool = source.pool || new GeoTIFF.Pool();

        this.whenReady = GeoTIFF.fromUrl(this.url)
            .then(async (geotiff) => {
                this.firstImage = await geotiff.getImage();
            });
    }

    urlFromExtent() {
        return '';
    }
}


export default COGSource;
