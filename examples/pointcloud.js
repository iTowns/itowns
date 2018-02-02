/* global itowns, debug, dat, setupLoadingScreen */

// eslint-disable-next-line no-unused-vars
function showPointcloud(serverUrl, fileName, lopocsTable) {
    var pointcloud;
    var oldPostUpdate;
    var viewerDiv;
    var debugGui;
    var view;
    var controls;

    viewerDiv = document.getElementById('viewerDiv');
    viewerDiv.style.display = 'block';

    itowns.THREE.Object3D.DefaultUp.set(0, 0, 1);

    itowns.proj4.defs('EPSG:3946',
        '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 ' +
        '+y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    debugGui = new dat.GUI({ width: 400 });

    // TODO: do we really need to disable logarithmicDepthBuffer ?
    view = new itowns.View('EPSG:3946', viewerDiv, { renderer: { logarithmicDepthBuffer: true } });
    setupLoadingScreen(viewerDiv, view);
    view.mainLoop.gfxEngine.renderer.setClearColor(0xcccccc);

    // Configure Point Cloud layer
    pointcloud = new itowns.GeometryLayer('pointcloud', new itowns.THREE.Group());
    pointcloud.file = fileName || 'infos/sources';
    pointcloud.protocol = 'potreeconverter';
    pointcloud.url = serverUrl;
    pointcloud.table = lopocsTable;

    // point selection on double-click
    function dblClickHandler(event) {
        var pick = view.pickObjectsAt(event, pointcloud);

        if (pick.length) {
            console.log('Selected point #' + pick[0].index + ' in Points "' + pick[0].object.owner.name + '"');
        }
    }
    view.mainLoop.gfxEngine.renderer.domElement.addEventListener('dblclick', dblClickHandler);


    function placeCamera(position, lookAt) {
        view.camera.camera3D.position.set(position.x, position.y, position.z);
        view.camera.camera3D.lookAt(lookAt);
        // create controls
        controls = new itowns.FirstPersonControls(view, { focusOnClick: true });
        debugGui.add(controls.options, 'moveSpeed', 1, 100).name('Movement speed');

        view.notifyChange(true);
    }

    // add pointcloud to scene
    function onLayerReady() {
        var ratio;
        var position;
        var lookAt;

        debug.PointCloudDebug.initTools(view, pointcloud, debugGui);

        view.camera.camera3D.far = 2.0 * pointcloud.root.bbox.getSize().length();

        ratio = pointcloud.root.bbox.getSize().x / pointcloud.root.bbox.getSize().z;
        position = pointcloud.root.bbox.min.clone().add(
            pointcloud.root.bbox.getSize().multiply({ x: 0, y: 0, z: ratio * 0.5 }));
        lookAt = pointcloud.root.bbox.getCenter();
        lookAt.z = pointcloud.root.bbox.min.z;
        placeCamera(position, lookAt);
        controls.moveSpeed = pointcloud.root.bbox.getSize().length() / 3;

        // update stats window
        oldPostUpdate = pointcloud.postUpdate;
        pointcloud.postUpdate = function postUpdate() {
            var info = document.getElementById('info');
            oldPostUpdate.apply(pointcloud, arguments);
            info.textContent = 'Nb points: ' +
                pointcloud.counters.displayedCount.toLocaleString() + ' (' +
                Math.floor(100 * pointcloud.counters.displayedCount / pointcloud.counters.pointCount) + '%) (' +
                view.mainLoop.gfxEngine.renderer.info.memory.geometries + ')';
        };
        window.view = view;
    }

    view.addLayer(pointcloud).then(onLayerReady);
}
