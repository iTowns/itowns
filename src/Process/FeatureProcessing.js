import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import handlingError from 'Process/handlerNodeError';
import Coordinates from 'Core/Geographic/Coordinates';
import Crs from 'Core/Geographic/Crs';
import OrientationUtils from 'Utils/OrientationUtils';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const dim_ref = new THREE.Vector2();
const dim = new THREE.Vector2();

export class FeatureNode extends THREE.Group {
    constructor(mesh) {
        super();
        this.place = new THREE.Group();
        this.mesh = mesh;
        this.add(this.place.add(mesh));
    }

    as(crs) {
        if (this.mesh.feature.crs == crs) {
            return;
        }
        const mesh = this.mesh;
        // calculate the scale transformation to transform the feature.extent
        // to feature.extent.as(crs)
        // coord.crs = Crs.formatToEPSG(mesh.feature.extent.crs);
        coord.crs = Crs.formatToEPSG(mesh.feature.crs);
        const extent =  mesh.feature.extent.as(coord.crs);
        extent.spatialEuclideanDimensions(dim_ref);
        extent.planarDimensions(dim);
        this.scale.copy(dim_ref).divide(dim).setZ(1);

        // Position and orientation
        // get method to calculate orientation
        const crs2crs = OrientationUtils.quaternionFromCRSToCRS('EPSG:4326', crs);

        // remove original position
        this.place.position.copy(mesh.position).negate();

        // get mesh coordinate
        coord.setFromVector3(mesh.position);

        // calculate orientation to crs
        crs2crs(coord.as('EPSG:4326'), this.quaternion);

        // transform position to crs
        coord.as(crs, coord).toVector3(this.position);

        this.updateMatrixWorld();

        return this;
    }
}

export default {
    update(context, layer, node) {
        if (!node.parent && node.children.length) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, node);
            return;
        }
        if (!node.visible) {
            return;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        } else if (!node.layerUpdateState[layer.id].canTryUpdate()) {
            // toggle visibility features
            const features = node.link.filter(n => n.layer && (n.layer.id == layer.id));
            features.forEach(n => n.layer.object3d.add(n));
            return;
        }

        const extentsDestination = node.getExtentsByProjection(layer.source.crs) || [node.extent];

        const zoomDest = extentsDestination[0].zoom;

        // check if it's tile level is equal to display level layer.
        if (zoomDest != layer.zoom.min ||
        // check if there's data in extent tile.
            !this.source.extentInsideLimit(node.extent, zoomDest) ||
        // In FileSource case, check if the feature center is in extent tile.
            (layer.source.isFileSource && !node.extent.isPointInside(layer.source.extent.center(coord)))) {
        // if not, there's not data to add at this tile.
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }

        node.layerUpdateState[layer.id].newTry();

        const command = {
            layer,
            extentsSource: extentsDestination,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: node,
        };

        return context.scheduler.execute(command).then((meshes) => {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();

            // TODO : find place to clear objet layer
            meshes.forEach((featureNode) => {
                if (featureNode) {
                    featureNode.as(context.view.referenceCrs);

                    // TODO: remove layer.onMeshCreated because there's one more call.
                    // call onMeshCreated callback if needed
                    if (layer.onMeshCreated) {
                        layer.onMeshCreated(featureNode, context);
                    }


                    if (!node.parent) {
                        // processus de nettoyage
                        // node.remove(featureNode);
                        // ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, featureNode);
                        // return;
                    } else {
                        layer.object3d.add(featureNode);
                        node.link.push(featureNode);
                    }
                }
            });
        },
        err => handlingError(err, node, layer, node.level, context.view));
    },
};
