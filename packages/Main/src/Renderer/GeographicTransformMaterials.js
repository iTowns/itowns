import * as THREE from 'three';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { Extent } from '@itowns/geographic';
import geoTransfomerfragmentShader from './Shader/geoTransformFS.glsl';

class GeographicTransformMaterial extends THREE.ShaderMaterial {
    constructor(options) {
        const params = {
            transparent: true,
            uniforms: {
                ...CopyShader.uniforms,
                mapToUvTransform: { value: new THREE.Matrix3() },
                localUvToWorldTransform: { value: new THREE.Matrix3() },
                mapTransform: { value: new THREE.Matrix3() },
            },
            vertexShader: CopyShader.vertexShader,
            fragmentShader: options.defines ? geoTransfomerfragmentShader : CopyShader.fragmentShader,
        };
        super(params);

        if (options.defines) {
            this.defines = options.defines;
        }
    }
    setTexture(tDiffuse) {
        this.uniforms.tDiffuse.value = tDiffuse;
    }

    setOpacity(opacity) {
        this.uniforms.opacity.value = opacity;
    }

    setOutputExtent(outputExtent) {
        this.outputExtent = outputExtent;
    }
}

const inputExtent = new Extent('EPSG:4326');
const extent = new Extent('EPSG:4326');
const s = new THREE.Vector2();
const t = new THREE.Vector2();

export const materialUnit =  new GeographicTransformMaterial({
    fragmentShader: CopyShader.fragmentShader,
});

export const materialMercatorToWGS84 = new (class extends GeographicTransformMaterial {
    setTexture(tDiffuse) {
        super.setTexture(tDiffuse);
        tDiffuse.extent.toExtent(tDiffuse.extent.crs, inputExtent);
        inputExtent.planarDimensions(s);
        t.set(inputExtent.west, inputExtent.south);
        this.uniforms.mapToUvTransform.value.set(
            1 / s.x,    0,          -t.x / s.x,
            0,          1 / s.y,    -t.y / s.y,
            0,          0,           1,
        );
    }
    setOutputExtent(outputExtent) {
        super.setOutputExtent(outputExtent);

        this.outputExtent.planarDimensions(s).multiplyScalar(THREE.MathUtils.DEG2RAD);
        t.set(this.outputExtent.west, this.outputExtent.south).multiplyScalar(THREE.MathUtils.DEG2RAD);

        this.uniforms.localUvToWorldTransform.value.set(
            s.x, 0, t.x,
            0, s.y, t.y,
            0,  0,  1,
        );
    }
})({
    defines: {
        EPSG_4326_EPSG_3857: 1,
    },
});

export const materialMercatorToWGS84Optimized = new (class extends GeographicTransformMaterial {
    setTexture(tDiffuse) {
        super.setTexture(tDiffuse);
        tDiffuse.extent.toExtent(tDiffuse.extent.crs, inputExtent);
        this.outputExtent.transformToParent(inputExtent.as(this.outputExtent.crs, extent), this.uniforms.mapTransform.value);
    }
})({
    defines: {
        EPSG_4326_EPSG_3857: 1,
        OPTIMIZED: 1,
    },
});
