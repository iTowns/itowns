/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * A Faire
 * Les tuiles de longitude identique ont le maillage et ne demande pas 1 seule calcul pour la génération du maillage
 *
 *
 *
 *
 */



define('Core/Commander/Providers/TileProvider', [
        'Core/Commander/Providers/Provider',
        'THREE',
        'Core/Geographic/Projection',
        'Globe/TileGeometry',
        'Core/Geographic/CoordWMTS',
        'Core/Math/Ellipsoid',
        'Globe/BuilderEllipsoidTile',
        'Core/defaultValue',
        'Scene/BoundingBox'
    ],
    function(
        Provider,
        THREE,
        Projection,
        TileGeometry,
        CoordWMTS,
        Ellipsoid,
        BuilderEllipsoidTile,
        defaultValue,
        BoundingBox
    ) {

        function TileProvider(size) {
            //Constructor
            Provider.call(this, null);

            this.projection = new Projection();
            this.ellipsoid = new Ellipsoid(size);
            this.builder = new BuilderEllipsoidTile(this.ellipsoid,this.projection);

            this.cacheGeometry = [];
            this.tree = null;
            this.nNode = 0;

        }

        TileProvider.prototype = Object.create(Provider.prototype);

        TileProvider.prototype.constructor = TileProvider;

        TileProvider.prototype.supports = function(protocol) {
            return protocol === 'tile';
        }

        TileProvider.prototype.getGeometry = function(bbox, cooWMTS) {
            var geometry = undefined;
            var n = Math.pow(2, cooWMTS.zoom + 1);
            var part = Math.PI * 2.0 / n;

            if (this.cacheGeometry[cooWMTS.zoom] !== undefined && this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] !== undefined) {
                geometry = this.cacheGeometry[cooWMTS.zoom][cooWMTS.row];
            } else {
                if (this.cacheGeometry[cooWMTS.zoom] === undefined)
                    this.cacheGeometry[cooWMTS.zoom] = new Array();

                var precision = 16;
                var rootBBox = new BoundingBox(0, part + part * 0.01, bbox.minCarto.latitude, bbox.maxCarto.latitude);

                geometry = new TileGeometry(rootBBox, precision, this.ellipsoid, cooWMTS.zoom);
                this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] = geometry;

            }

            return geometry;
        };


        TileProvider.prototype.executeCommand = function(command) {

            var bbox = command.paramsFunction.bbox;

            // TODO not generic
            var tileCoord = this.projection.WGS84toWMTS(bbox);
            var parent = command.requester;

            // build tile
            var geometry = undefined; //getGeometry(bbox,tileCoord);

            var params = {bbox:bbox,zoom:tileCoord.zoom,segment:16,center:null,projected:null}

            var tile = new command.type(params,this.builder);

            tile.tileCoord = tileCoord;
            tile.material.setUuid(this.nNode++);
            tile.link = parent.link;
            tile.geometricError = Math.pow(2, (18 - tileCoord.zoom));

            if (geometry) {
                tile.rotation.set(0, (tileCoord.col % 2) * (Math.PI * 2.0 / Math.pow(2, tileCoord.zoom + 1)), 0);
            }

            parent.worldToLocal(params.center);

            tile.position.copy(params.center);
            tile.setVisibility(true);

            parent.add(tile);
            tile.updateMatrix();
            tile.updateMatrixWorld();

            return command.resolve(tile);
        };

        return TileProvider;

    });
