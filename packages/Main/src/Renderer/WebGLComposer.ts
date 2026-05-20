import * as THREE from 'three';
import { Extent } from '@itowns/geographic';
// eslint-disable-next-line import/extensions
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// eslint-disable-next-line import/extensions
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js';
import { RasterTile } from './RasterTile';
import {
    materialUnit,
    materialMercatorToWGS84,
    materialMercatorToWGS84Optimized } from './GeographicTransformMaterials';

declare module 'three' {
  interface Texture {
    extent: Extent | null | undefined,
  }
}

const getGeographicTransformMaterial =
    (input : string, outputExtent : Extent | null | undefined) => {
        if (!outputExtent || input == outputExtent.crs) {
            return materialUnit;
        }
        if (input == 'EPSG:3857' && outputExtent.crs == 'EPSG:4326') {
            // todo could computed with the size texture
            if (outputExtent.planarDimensions().x < 0.01) {
                return materialMercatorToWGS84Optimized;
            } else {
                return materialMercatorToWGS84;
            }
        }

        console.log('No Geographic Transform Material');
    };

class GeographicProjectionPass extends Pass {
    tiles: RasterTile[];
    extent: Extent | null;
    _fsQuad: FullScreenQuad;
    clear: boolean;
    constructor() {
        super();
        this._fsQuad = new FullScreenQuad();
        this.tiles = [];
        this.extent = null;
        this.clear = true;
        this.needsSwap = true;
    }

    render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
        renderer.setRenderTarget(writeBuffer);

        const inputCrs = this.tiles[0].layer.crs;

        const outputExtent = writeBuffer.texture.extent;

        const geographicTransformMaterial = getGeographicTransformMaterial(inputCrs, outputExtent);

        if (geographicTransformMaterial) {
            geographicTransformMaterial.setOutputExtent(outputExtent);

            this._fsQuad.material = geographicTransformMaterial;

            if (this.clear) { renderer.clear(); }

            this.tiles.forEach((tile) => {
                if (tile.visible) {
                    geographicTransformMaterial.setOpacity(tile.opacity);

                    tile.textures.forEach((texture) => {
                        if (texture) {
                            geographicTransformMaterial.setTexture(texture);
                            this._fsQuad.render(renderer);
                        }
                    });
                }
            });
        }
    }

    dispose() {
        this._fsQuad.dispose();
    }
}

const geographicProjectionPass = new GeographicProjectionPass();
let composer : null | EffectComposer = null;

const dotPass = new DotScreenPass(new THREE.Vector2(0, 0), 0.5, 0.8);
// console.log('dotPass', dotPass);
dotPass.needsSwap = false;

export function drawMap(
    renderTarget: THREE.WebGLRenderTarget,
    tiles: RasterTile[],
    renderer: THREE.WebGLRenderer,
): undefined {
    if (!composer) {
        composer = new EffectComposer(renderer, renderTarget);
        composer.addPass(geographicProjectionPass);
        composer.addPass(dotPass);
    } else {
        composer.renderer = renderer;
        composer.renderTarget1 = renderTarget;
        composer.writeBuffer = renderTarget;
    }

    geographicProjectionPass.tiles = tiles;

    const wasVREnabled = renderer.xr.enabled;
    if (wasVREnabled) { renderer.xr.enabled = false; }

    // todo verify if renderer size isn't overkill
    composer.render();

    if (wasVREnabled) { renderer.xr.enabled = true; }
}
