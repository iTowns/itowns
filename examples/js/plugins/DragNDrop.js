/* global itowns */
/**
 * This module can be added to a web page or in a web application. It provides a
 * simple behavior where single files can be drag and dropped onto a viewer. No
 * relationship between a type of file and the way it is read, parsed and
 * displayed are stored in the plugin. Use the method `register` to declare the
 * way a file is read, parsed and displayed.
 *
 * Note: only files with the crs projection `EPSG:4326` can be projected correctly
 * using this plugin.
 *
 * @module DragNDrop
 *
 * @example
 * &lt;script src="js/DragNDrop.js">&lt;/script>
 * &lt;script type="text/javascript">
 *      var view = new itowns.GlobeView(document.getElementById('viewerDiv'));
 *
 *      DragNDrop.setView(view);
 *      DragNDrop.register('geojson', DragNDrop.JSON, itowns.GeoJsonParser.parse, DragNDrop.COLOR);
 *      DragNDrop.register('gpx', DragNDrop.XML, itowns.GpxParser.parse, DragNDrop.GEOMETRY);
 * &lt;/script>
 *
 * @example
 * require('./js/itowns.js');
 * require('./plugins/DragNDrop.js');
 *
 * const view = new itowns.GlobeView(document.getElementById('viewerDiv'));
 *
 * DragNDrop.setView(view);
 * DragNDrop.register('geojson', DragNDrop.JSON, itowns.GeoJsonParser.parse, DragNDrop.COLOR);
 * DragNDrop.register('gpx', DragNDrop.XML, itowns.GpxParser.parse, DragNDrop.GEOMETRY);
 */
const DragNDrop = (function _() {
    // TYPE
    const _TEXT = 1;
    const _JSON = 2;
    const _BINARY = 3;
    const _IMAGE = 4;
    const _XML = 5;

    // MODE
    const _COLOR = 6;
    const _GEOMETRY = 7;

    const extensionsMap = {};
    const fileReader = new FileReader();

    let _view;

    function addFiles(event, files) {
        event.preventDefault();

        // Read each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const extension = extensionsMap[file.name.split('.').pop().toLowerCase()];

            // eslint-disable-next-line no-loop-func
            fileReader.onload = function onload(e) {
                let data = e.target.result;

                if (extension.type == _JSON) {
                    data = JSON.parse(data);
                } else if (extension.type == _XML) {
                    data = new window.DOMParser().parseFromString(data, 'text/xml');
                }

                const crs = extension.mode == _GEOMETRY ? _view.referenceCrs : _view.tileLayer.extent.crs;

                extension.parser(data, {
                    in: {
                        crs: 'EPSG:4326',
                    },
                    out: {
                        crs: crs,
                        buildExtent: true,
                        mergeFeatures: true,
                        structure: (extension.mode == _GEOMETRY ? '3d' : '2d'),
                        forcedExtentCrs: crs != 'EPSG:4978' ? crs : 'EPSG:4326',
                    },
                }).then(function _(features) {
                    const source = new itowns.FileSource({
                        features: features,
                        crs: 'EPSG:4326',
                    });

                    const randomColor = Math.round(Math.random() * 0xffffff);

                    let layer;
                    if (extension.mode == _COLOR) {
                        layer = new itowns.ColorLayer(file.name, {
                            transparent: true,
                            style: {
                                fill: {
                                    color: '#' + randomColor.toString(16),
                                    opacity: 0.7,
                                },
                                stroke: {
                                    color: '#' + randomColor.toString(16),
                                },
                            },
                            source: source,
                        });
                    } else if (extension.mode == _GEOMETRY) {
                        layer = new itowns.FeatureGeometryLayer(
                            file.name,
                            {
                                style: {
                                    fill: {
                                        color: 'red',
                                        extrusion_height: 200,
                                    },
                                },
                                source: source,
                                opacity: 0.7,
                            });
                    } else {
                        throw new Error('Mode of file not supported, please add it using DragNDrop.register');
                    }

                    _view.addLayer(layer);

                    const extent = features.extent.clone();
                    // Transform local extent to data.crs projection.
                    if (extent.crs == features.crs) {
                        extent.applyMatrix4(features.matrixWorld);
                    }

                    // Move the camera
                    itowns.CameraUtils.transformCameraToLookAtTarget(_view, _view.camera3D, extent);
                });
            };

            switch (extension.type) {
                case _TEXT:
                case _JSON:
                case _XML:
                    fileReader.readAsText(file);
                    break;
                case _BINARY:
                    fileReader.readAsArrayBuffer(file);
                    break;
                case _IMAGE:
                    fileReader.readAsBinaryString(file);
                    break;
                default:
                    throw new Error('Type of file not supported, please add it using DragNDrop.register');
            }
        }
    }

    // Listen to drag and drop actions
    document.addEventListener('dragenter', function _(e) { e.preventDefault(); }, false);
    document.addEventListener('dragover', function _(e) { e.preventDefault(); }, false);
    document.addEventListener('dragleave', function _(e) { e.preventDefault(); }, false);
    document.addEventListener('drop', function _(e) { addFiles(e, e.dataTransfer.files); }, false);
    document.addEventListener('paste', function _(e) { addFiles(e, e.clipboardData.files); }, false);

    return {
        TEXT: _TEXT,
        JSON: _JSON,
        BINARY: _BINARY,
        IMAGE: _IMAGE,
        XML: _XML,

        COLOR: _COLOR,
        GEOMETRY: _GEOMETRY,

        /**
         * Register a type of file to read after a drag and drop on the viewer.
         * The file will be processed following its extension and instructions
         * given here.
         *
         * @param {string} extension - The extension to register. Each file
         * dropped ending with this extension will follow the instructions given
         * by the others parameters of this function.
         * @param {number} type - The type of file to register. Can be
         * `DragNDrop.TEXT` (equivalent to `Fetcher.text`), `DragNDrop.JSON`
         * (equivalent to `Fetcher.json`), `DragNDrop.BINARY` (equivalent to
         * `Fetcher.arrayBuffer`), `DragNDrop.IMAGE` (equivalent to
         * `Fetcher.texture`) or  `DragNDrop.XML` (equivalent to `Fetcher.xml`).
         * @param {Function} parser - The method to parse the content of the
         * added file.
         * @param {number} mode - Choose the mode the file is displayed: either
         * `DragNDrop.COLOR` (equivalent to a `ColorLayer`) or
         * `DragNDrop.GEOMETRY` (equivalent to a `GeometryLayer`).
         *
         * @memberof module:DragNDrop
         */
        register: function _(extension, type, parser, mode) {
            extensionsMap[extension.toLowerCase()] = {
                type: type,
                parser: parser,
                mode: mode,
            };
        },

        /**
         * The DragNDrop plugin needs to be binded to a view. Specified it using
         * this method.
         *
         * @param {View} view - The view to bind to the DragNDrop interface.
         *
         * @memberof module:DragNDrop
         */
        setView: function _(view) {
            _view = view;
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = DragNDrop;
}
