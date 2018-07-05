import GeometryLayer from './GeometryLayer';

class TiledGeometryLayer extends GeometryLayer {
    constructor(id, object3d) {
        super(id, object3d);

        this.protocol = 'tile';
        this.visible = true;
        this.lighting = {
            enable: false,
            position: { x: -0.5, y: 0.0, z: 1.0 },
        };
    }

    preUpdate(context, changeSources) {
        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return this.level0Nodes;
            }
            if (source.this === this) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);
                    if (!commonAncestor) {
                        return this.level0Nodes;
                    }
                }
                if (commonAncestor.material == null) {
                    commonAncestor = undefined;
                }
            }
        }
        if (commonAncestor) {
            if (__DEBUG__) {
                this._latestUpdateStartingLevel = commonAncestor.level;
            }
            return [commonAncestor];
        } else {
            return this.level0Nodes;
        }
    }

    onTileCreated(node) {
        node.material.setLightingOn(this.lighting.enable);
        node.material.uniforms.lightPosition.value = this.lighting.position;

        if (this.noTextureColor) {
            node.material.uniforms.noTextureColor.value.copy(this.noTextureColor);
        }

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: this.showOutline || false };
            node.material.wireframe = this.wireframe || false;
        }
    }
}

export default TiledGeometryLayer;
