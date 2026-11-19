import * as THREE from 'three';
import * as wgpu from 'three/webgpu';
import * as tsl from 'three/tsl';
// import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';

const enum RenderMode {
    COLOR,
    CLASSIFICATION,
    RETURN_COUNT,
}

export default class PointsMaterialTsl extends wgpu.SpriteNodeMaterial {
    constructor(attributes: Record<string, THREE.TypedArray>, public renderMode: RenderMode) {
        function classification_coloring(classif: wgpu.Node): wgpu.Node {
            return tsl.array([
                tsl.vec3(1, 0, 0),
                tsl.vec3(0, 1, 0),
                tsl.vec3(0, 0, 1),
            ]).element(classif.mod(3));
        }

        const positionAttribute = new wgpu.InstancedBufferAttribute(attributes.positions as Float32Array, 3);
        positionAttribute.name = 'positionAttribute';
        const position = tsl.instancedBufferAttribute(positionAttribute);

        const colorAttribute = tsl.instancedBufferAttribute(new wgpu.InstancedBufferAttribute(attributes.colors as Uint8Array, 4)).setName('colorAttribute').div(255).setName('colorFinal');
        const classificationAttribute = classification_coloring(
            tsl.instancedBufferAttribute(
                new wgpu.InstancedBufferAttribute(attributes.Classification as Uint16Array, 1),
            ).setName('classificationAttribute'),
        );
        const returnCountAttribute = tsl.instancedBufferAttribute(new wgpu.InstancedBufferAttribute(attributes.NumberOfReturns as Uint16Array, 1)).setName('returnCountAttribute').toFloat();

        renderMode = RenderMode.CLASSIFICATION;
        const color = [colorAttribute, classificationAttribute, returnCountAttribute][renderMode];

        super({
            positionNode: position,
            opacityNode: tsl.shapeCircle(),
            colorNode: color,
            scaleNode: tsl.float(0.0008),
            vertexColors: true,
            sizeAttenuation: false,
        });
    }
}
