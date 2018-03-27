import * as THREE from 'three';

function createDebugGeometry(view) {
    const group = new THREE.Group();

    for (let i = 0; i < 3; i++) {
        const geom = new THREE.CircleGeometry(0.5, 30);
        geom.vertices = geom.vertices.splice(1);
        group.add(new THREE.Line(geom));
    }

    group.sseThreshold = group.children[0];
    group.sseThreshold.material.color = new THREE.Color(0x00ff00);
    // group.sseThreshold.material.transparent = true;
    group.sseThreshold.material.depthTest = false;
    group.sseThreshold.material.opacity = 0.25;
    group.sseThreshold.frustumCulled = false;
    group.sseThreshold.renderOrder = 10;
    group.sseValue = group.children[2];
    group.sseValue.material.color = new THREE.Color(0xff0000);
    group.sseValue.frustumCulled = false;
    group.sseValue.visible = false;
    group.sseValue.material.depthTest = false;
    group.sseValue.material.transparent = true;
    group.sseValue.material.opacity = 0.25;
    group.sseValue.renderOrder = 10;
    group.sseShift = group.children[1];
    group.sseShift.material.color = new THREE.Color(0xffff00);
    group.sseShift.material.transparent = true;
    group.sseShift.material.depthTest = false;
    group.sseShift.material.opacity = 0.25;
    group.sseShift.frustumCulled = false;
    group.sseShift.renderOrder = 10;
    group.foo = new THREE.Group();
    group.axis = new THREE.AxesHelper(1);
    group.axis.renderOrder = 11;

    group.frustumCulled = false;

    view.scene.add(group);
    view.scene.add(group.foo);
    group.foo.add(group.axis);

    return group;
}


function display(camera, sseResult, geometricError, sseThresholdPx, group, coords, scale, matrix) {
    const m = new THREE.Matrix4().getInverse(
        camera.camera3D.projectionMatrix);

    const sseShift = sseResult.offset || 0;
    // on scree
    const ray = new THREE.Vector3(coords.x, coords.y, 0);
    const ray2a = new THREE.Vector3(coords.x + (2 * (sseShift) / camera.width), coords.y, 0);
    const ray2b = new THREE.Vector3(coords.x + (2 * (sseThresholdPx + sseShift) / camera.width), coords.y, 0);
    const ray3x = new THREE.Vector3(
        coords.x + (2 * (sseResult.sse[0]) / camera.width), coords.y, 0);
    const ray3y = new THREE.Vector3(
        coords.x + (2 * (sseResult.sse[1]) / camera.width), coords.y, 0);
    const ray3z = new THREE.Vector3(
        coords.x + (2 * (sseResult.sse[2]) / camera.width), coords.y, 0);
    const rays = [ray, ray2a, ray2b, ray3x, ray3y, ray3z];

    for (const r of rays) {
        // Transform in camera space
        r.applyMatrix4(m);
        // Scale back to desired z position
        r.multiplyScalar(sseResult.distance / -r.z);
        // Transform in world position
        r.applyMatrix4(camera.camera3D.matrixWorld);
    }

    group.position.copy(ray);
    group.rotation.copy(camera.camera3D.rotation);

    const sseShiftWorld = ray2a.sub(ray).length();
    const sseThresholdWorld = ray2b.sub(ray).length();
    // * 0.5 because we draw the lines from the center of the circle
    const sseValueWorldX = ray3x.sub(ray).length() * 0.5;
    const sseValueWorldY = ray3y.sub(ray).length() * 0.5;
    const sseValueWorldZ = ray3z.sub(ray).length() * 0.5;

    // Autre option :
    // on affiche un AxisHelper, tourné

    // draw a line to show sse threshold
    group.sseShift.scale.set(sseShiftWorld * scale, sseShiftWorld * scale, 1);
    group.sseThreshold.scale.set(sseThresholdWorld * scale, sseThresholdWorld * scale, 1);
    // draw a line to show geometric error
    // (both values are the same when using Math.max in ScreenSpaceError)
    group.sseValue.scale.set(sseValueWorldX * scale, sseValueWorldY * scale, 1);

    group.foo.matrix.identity();
    matrix.decompose(
        group.foo.position, group.foo.quaternion, group.foo.scale);
    group.foo.position.copy(ray);
    group.foo.scale.set(1, 1, 1);
    group.axis.scale.set(sseValueWorldX, sseValueWorldY, sseValueWorldZ);
    group.foo.updateMatrixWorld(true);

    group.visible = true;
    group.updateMatrixWorld(true);
}

function findValuesInParent(obj) {
    if (obj.sse) {
        return {
            sse: obj.sse,
            geometricError: obj.geometricError,
        };
    }
    if (obj.parent) {
        return findValuesInParent(obj.parent);
    }
}

function onMouseMove(evt) {
    const objects = this.view.pickObjectsAt(evt);
    const v = this.group.visible;
    this.group.visible = false;
    if (objects.length > 0) {
        if (objects[0].layer) {
            const o = objects[0].object;
            const layers = this.view.getLayers(l => l.id == objects[0].layer);
            if (layers.length > 0) {
                let sse = objects[0].object.sse;
                let geometricError = o.geometricError;
                if (!sse) {
                    // Points ?
                    if (o.owner) {
                        sse = o.owner.sse;
                        geometricError = o.owner.geometricError;
                    } else {
                        const c = findValuesInParent(o);
                        sse = c.sse;
                        geometricError = c.geometricError;
                    }
                }

                if (sse) {
                    const sseShift = sse.offset || 0;
                    const percent =
                        sse.sse.map(e => Math.round(
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    100 * (e / (layers[0].sseThreshold + sseShift))))));
                    this.sse = percent.join('% ') + '%';
                    display(
                        this.view.camera,
                        sse,
                        geometricError,
                        layers[0].sseThreshold,
                        this.group,
                        this.view.eventToNormalizedCoords(evt),
                        this.scale,
                        o.matrixWorld);
                    this.view.notifyChange(true);
                }
            }
        }
    }
    if (v != this.group.visible) {
        this.view.notifyChange(true);
    }
}


export default {
    create(datFolder, view) {
        // add gui folder
        const folder = datFolder.addFolder('Screen Space Error');

        const state = {
            enabled: false,
            group: createDebugGeometry(view),
            sse: '0',
            view,
            scale: 1,
        };

        const bound = onMouseMove.bind(state);
        folder.add(state, 'enabled').onChange(() => {
            if (state.enabled) {
                view.mainLoop.gfxEngine.renderer.domElement.addEventListener(
                    'mousemove', bound);
            } else {
                state.group.visible = false;
                view.mainLoop.gfxEngine.renderer.domElement.removeEventListener(
                    'mousemove', bound);
            }
        });
        folder.add(state, 'sse', 0, 100).listen();
        folder.add(state, 'scale', 1, 10);
    },
};
