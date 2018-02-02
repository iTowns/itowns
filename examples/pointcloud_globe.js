/* global itowns, debug, dat */

// eslint-disable-next-line no-unused-vars
function showPointcloud(serverUrl, fileName) {
    var pointcloud;
    var oldPostUpdate;
    var viewerDiv;
    var debugGui;
    var view;
    var positionOnGlobe;

    viewerDiv = document.getElementById('viewerDiv');
    viewerDiv.style.display = 'block';

    debugGui = new dat.GUI();

    positionOnGlobe = { longitude: 4.631512, latitude: 43.675626, altitude: 250 };

    view = new itowns.GlobeView(viewerDiv, positionOnGlobe, { handleCollision: false });

    view.controls.minDistance = 0;
    function addLayerCb(layer) {
        return view.addLayer(layer);
    }

    // Configure Point Cloud layer
    pointcloud = new itowns.GeometryLayer('pointcloud', view.scene);
    pointcloud.file = fileName || 'infos/sources';
    pointcloud.protocol = 'potreeconverter';
    pointcloud.url = serverUrl;

    // point selection on double-click
    function dblClickHandler(event) {
        var pick;
        var mouse = view.eventToViewCoords(event);
        mouse.y = (event.currentTarget.height || event.currentTarget.offsetHeight) - mouse.y;

        pick = itowns.PointCloudProcessing.selectAt(view, pointcloud, mouse);
        if (pick) {
            console.log('Selected point #' + pick.index + ' in Points "' + pick.points.owner.name + '"');
        }
    }
    view.mainLoop.gfxEngine.renderer.domElement.addEventListener('dblclick', dblClickHandler);

    // add pointcloud to scene
    function onLayerReady() {
        debug.PointCloudDebug.initTools(view, pointcloud, debugGui);

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

    itowns.View.prototype.addLayer.call(view, pointcloud).then(onLayerReady);

    itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb);
    itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb);
}
