import Extent from '../Core/Geographic/Extent';
import Coordinates from '../Core/Geographic/Coordinates';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';
import ObjectRemovalHelper from './ObjectRemovalHelper';
import TiledGeometryLayer from '../Layer/TiledGeometryLayer';


const center = new Coordinates('EPSG:4326', 0, 0, 0);
function subdivisionExtents(bbox) {
    bbox.center(center);

    const northWest = new Extent(bbox.crs(),
        bbox.west(), center._values[0],
        center._values[1], bbox.north());
    const northEast = new Extent(bbox.crs(),
        center._values[0], bbox.east(),
        center._values[1], bbox.north());
    const southWest = new Extent(bbox.crs(),
        bbox.west(), center._values[0],
        bbox.south(), center._values[1]);
    const southEast = new Extent(bbox.crs(),
        center._values[0], bbox.east(),
        bbox.south(), center._values[1]);

    return [northWest, northEast, southWest, southEast];
}

function subdivideNode(context, layer, node) {
    if (!node.pendingSubdivision && !node.children.some(n => n.layer == layer)) {
        const extents = subdivisionExtents(node.extent);
        // TODO: pendingSubdivision mechanism is fragile, get rid of it
        node.pendingSubdivision = true;

        const command = {
            /* mandatory */
            view: context.view,
            requester: node,
            layer,
            priority: 10000,
            /* specific params */
            extentssource: extents,
            redraw: false,
        };

        context.scheduler.execute(command).then((children) => {
            for (const child of children) {
                node.add(child);
                child.updateMatrixWorld(true);

                child.material.uniforms.lightPosition.value =
                    node.material.uniforms.lightPosition.value;
                child.material.uniforms.lightingEnabled.value =
                    node.material.uniforms.lightingEnabled.value;
            }
            // TODO
            /*
              if (child.material.elevationLayersId.length) {
                // need to force update elevation when delta is important
                if (child.level - child.material.getElevationLayerLevel() > 6) {
                    updateNodeElevation(_this.scene, params.tree, child, params.layersConfig, true);
                }
            }
            */
            node.pendingSubdivision = false;
            context.view.notifyChange(node, false);
        }, (err) => {
            node.pendingSubdivision = false;
            if (!(err instanceof CancelledCommandException)) {
                throw new Error(err);
            }
        });
    }
}

export default function processTiledGeometryNode(cullingTest, subdivisionTest) {
    return function _processTiledGeometryNode(context, layer, node) {
        if (!node.parent) {
            return ObjectRemovalHelper.removeChildrenAndCleanup(layer, node);
        }
        // early exit if parent' subdivision is in progress
        if (node.parent.pendingSubdivision) {
            node.visible = false;
            node.setDisplayed(false);
            return undefined;
        }

        // do proper culling
        const isVisible = cullingTest ? (!cullingTest(node, context.camera)) : true;
        node.visible = isVisible;

        if (isVisible) {
            let requestChildrenUpdate = false;

            if (node.pendingSubdivision || (TiledGeometryLayer.hasEnoughTexturesToSubdivide(context, node) && subdivisionTest(context, layer, node))) {
                subdivideNode(context, layer, node);
                // display iff children aren't ready
                node.setDisplayed(node.pendingSubdivision);
                requestChildrenUpdate = true;
            } else {
                node.setDisplayed(true);
            }

            if (node.material.visible) {
                // update uniforms
                if (context.view.fogDistance != undefined) {
                    node.setFog(context.view.fogDistance);
                }

                if (!requestChildrenUpdate) {
                    return ObjectRemovalHelper.removeChildren(layer, node);
                }
            }

            // TODO: use Array.slice()
            return requestChildrenUpdate ? node.children.filter(n => n.layer == layer) : undefined;
        }

        node.setDisplayed(false);
        return ObjectRemovalHelper.removeChildren(layer, node);
    };
}
