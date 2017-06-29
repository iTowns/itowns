import * as THREE from 'three';
import Capabilities from '../Core/System/Capabilities';
import fit from './Packer';

const availableCanvas = [];

function getCanvas() {
    if (availableCanvas.length > 0) {
        return availableCanvas.pop();
    }
    const canvas = document.createElement('canvas');
    canvas.onDispose = (c) => {
        availableCanvas.push(c);
    };
    return canvas;
}

/**
 * Build a texture atlas from N images.
 *
 * We use a classic 2D Bin Packing algorithm to assign each individual image a
 * location in the resulting texture.
 * Then this texture is created using a <canvas>,  onto which we draw all images.
 * In the end we return a THREE.CanvasTexture and an array 'uv' of Vector4, describing
 * the position/size of each input images in the atlas.
 * @param {array} images - an array of <img>
 * @param {array} uvs - an array of coordinates indicating what part of the image we should keep
 * @return {THREE.CanvasTexture}
 */
export default function pack(images, uvs) {
    // pick an available canvas, or build a new one
    const atlasCanvas = getCanvas();
    // Use a 1 pixel border to avoid color bleed when sampling at the edges
    // of the texture
    const colorBleedHalfOffset = (images.length == 1) ? 0 : 1;
    const maxSize = Capabilities.getMaxTextureSize();
    const blocks = [];

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const replaceWithEmpty = !img;
        const sWidth = replaceWithEmpty ? 1 : img.width * uvs[i].z;
        const sHeight = replaceWithEmpty ? 1 : img.height * uvs[i].z;

        blocks.push({
            index: i,
            w: sWidth + 2 * colorBleedHalfOffset,
            h: sHeight,
            empty: replaceWithEmpty,
        });
    }

    // sort from big > small images (the packing alg works best if big images are treated first)
    blocks.sort((a, b) => Math.max(a.w, a.h) < Math.max(b.w, b.h));

    // TODO: if all images don't fit on 1 row, add vertical spacing
    const { maxX, maxY } = fit(blocks, maxSize, maxSize);

    // allocate canvas size
    atlasCanvas.width = maxX;
    atlasCanvas.height = maxY;

    const uv = [];
    const ctx = atlasCanvas.getContext('2d');

    // Iterate on all blocks, and draw images on canvas
    for (const block of blocks) {
        const i = block.index;
        const img = images[i];

        // src describe where (x, y) to read in source image, and the size (width, height)
        // (for now its values are normalized)
        const src = {
            x: uvs[i].x * uvs[i].z,
            y: uvs[i].y * uvs[i].z,
            width: uvs[i].z,
            height: uvs[i].z,
        };


        const x = block.fit.x + colorBleedHalfOffset;
        const y = block.fit.y;

        if (!block.empty) {
            src.x *= img.width;
            src.y *= img.height;
            src.width *= img.width;
            src.height *= img.height;

            // draw the whole image
            ctx.drawImage(img,
                src.x, // sx
                src.y, // sy
                src.width, // sWidth
                src.height, // sHeight
                x, // dx
                y, // dy
                src.width, // dWidth
                src.height); // dHeight

            // draw left column copy
            ctx.drawImage(img,
                src.x, // sx
                src.y, // sy
                1, // sWidth
                src.height, // sHeight
                x - colorBleedHalfOffset, // dx
                y, // dy
                colorBleedHalfOffset, // dWidth
                src.height);

            // draw right column copy
            ctx.drawImage(img,
                src.x + src.width - colorBleedHalfOffset - 1, // sx
                src.y, // sy
                1, // sWidth
                src.height, // sHeight
                x + src.width, // dx
                y, // dy
                colorBleedHalfOffset, // dWidth
                src.height);
        }

        // dst describe where src will be written (x, y) and the size of src
        // (dst is normalized, so x/z (resp y/w) are divided by atlas width (resp height))
        const dst = new THREE.Vector4(
            x / atlasCanvas.width,
            y / atlasCanvas.height,
            src.width / atlasCanvas.width,
            src.height / atlasCanvas.height);

        uv.push(dst);
    }

    const atlas = new THREE.CanvasTexture(atlasCanvas);

    atlas.generateMipmaps = false;
    atlas.magFilter = THREE.LinearFilter;
    atlas.minFilter = THREE.LinearFilter;
    atlas.anisotropy = 1;

    return { atlas, uv };
}
