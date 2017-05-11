import LayerUpdateState from '../Scene/LayerUpdateState';
import { CancelledCommandException } from '../Core/Commander/Scheduler';

function updateFeatureRTC(feature, mat) {
    if (feature.material) {
        feature.material.setMatrixRTC(mat);
    }
    for (const n of feature.children) {
        updateFeatureRTC(n, mat);
    }
}

export default function updateFeaturesAtNode(context, layer, node) {
    if (!node.visible) {
        return;
    }

    const features = node.children.filter(n => n.layer == layer.id);
    if (features.length > 0) {
        const mat = context.scene.gfxEngine.getRTCMatrixFromNode(features[0], context.camera);
        updateFeatureRTC(features[0], mat);
        return;
    }


    if (!layer.tileInsideLimit(node, layer)) {
        return;
    }

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
    }

    const ts = Date.now();

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return;
    }

    node.layerUpdateState[layer.id].newTry();

    const command = {
        layer,
        threejsLayer: layer.threejsLayer,
        requester: node,
    };

    context.scheduler.execute(command).then((result) => {
        // if request return empty json, WFS_Provider.getFeatures return undefined
        if (result && result.feature) {
            result.feature.layer = layer.id;
            // we don't care about result.feature.position because its
            // matrixWorld is locked anyway (matrix = matrixWorld)
            node.add(result.feature);
            result.feature.frustumCulled = false;
            result.feature.visible = true;
            result.feature.layers.set(command.threejsLayer);

            const mat = context.scene.gfxEngine.getRTCMatrixFromNode(result.feature, context.camera);
            updateFeatureRTC(result.feature, mat);
            node.layerUpdateState[layer.id].success();
        } else {
            node.layerUpdateState[layer.id].failure(1, true);
        }
    },
    (err) => {
        if (err instanceof CancelledCommandException) {
            node.layerUpdateState[layer.id].success();
        } else if (err instanceof SyntaxError) {
            node.layerUpdateState[layer.id].failure(0, true);
        } else {
            node.layerUpdateState[layer.id].failure(Date.now());
            context.scene.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
        }
    });
}
