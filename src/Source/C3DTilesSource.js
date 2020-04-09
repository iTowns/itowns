import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import { $3dTilesExtensions } from 'Layer/C3DTilesLayer';

class C3DTilesSource extends Source {
    constructor(source) {
        super(source);
        this.baseUrl = this.url.slice(0, this.url.lastIndexOf('/') + 1);

        this.whenReady = Fetcher.json(this.url, this.networkOptions).then((tileset) => {
            // Verify that extensions of the tileset have been registered to
            // $3dTilesExtensions
            if (tileset.extensionsUsed) {
                for (const extensionUsed of tileset.extensionsUsed) {
                    // if current extension is not registered
                    if (!$3dTilesExtensions.isExtensionRegistered(extensionUsed)) {
                        if (tileset.extensionsRequired &&
                            tileset.extensionsRequired.includes(extensionUsed)) {
                            console.error(
                                `3D Tiles tileset required extension "${extensionUsed}" must be registered to $3dTilesExtensions global object of iTowns to be parsed and used.`);
                        } else {
                            console.warn(
                                `3D Tiles tileset used extension "${extensionUsed}" must be registered to $3dTilesExtensions global object of iTowns to be parsed and used.`);
                        }
                    }
                }
            }
            return tileset;
        });
    }
}

export default C3DTilesSource;
