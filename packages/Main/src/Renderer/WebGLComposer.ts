import * as THREE from 'three';
import { RasterTile } from './RasterTile';
import { materialUnit, materialMercatorToWGS84 } from './ProjectionMaterials';

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);

const materials = new Map();

const forwarding = (from, to) => ((from == to) ? 'transformUnit' : `${from} => ${to}`);

materials.set(forwarding(), materialUnit);
materials.set(forwarding('EPSG:3857', 'EPSG:4326'), materialMercatorToWGS84);

const quad = new THREE.Mesh(geometry, materialUnit);

export function drawMap(
    renderTarget: THREE.WebGLRenderTarget,
    tiles: RasterTile[],
    renderer: THREE.WebGLRenderer,
    extent: Extent,
): THREE.WebGLArrayRenderTarget | null {
    const previousRenderTarget = renderer.getRenderTarget();

    renderer.setRenderTarget(renderTarget);
    renderTarget.texture.extent = extent;

    for (const tile of tiles) {
        if (tile.visible) {
            quad.material = materials.get(
                forwarding(tile.layer.crs, tile.layer.parent.extent.crs));
            for (const texture of tile.textures) {
                quad.material.setUniforms(texture, extent, tile);
                renderer.render(quad, quadCam);
            }
        }
    }

    renderer.setRenderTarget(previousRenderTarget);

    return renderTarget;
}
