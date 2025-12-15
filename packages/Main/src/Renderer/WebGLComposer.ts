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
): undefined {
    // Store renderer state and temporarily disable VR
    const previousRenderTarget = renderer.getRenderTarget();
    const gl = renderer.getContext();
    const glViewport = gl.getParameter(gl.VIEWPORT);
    const wasVREnabled = renderer.xr.enabled;
    if (wasVREnabled) { renderer.xr.enabled = false; }

    renderer.setRenderTarget(renderTarget);
    const a = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    renderer.clear();
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
    // renderer.setViewport is not enough to update internal GL state
    gl.viewport(glViewport[0], glViewport[1], glViewport[2], glViewport[3]);
    if (wasVREnabled) { renderer.xr.enabled = true; }
    renderer.setClearAlpha(a);
}
