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
        'when',
        'Core/Geographic/Projection',
        'Core/Commander/Providers/WMTS_Provider',
        'Core/Commander/Providers/WMS_Provider',
        'Core/Commander/Providers/KML_Provider',
        'Globe/TileGeometry',
        'Core/Geographic/CoordWMTS',
        'Core/Math/Ellipsoid',
        'Globe/BuilderEllipsoidTile',
        'Core/defaultValue',
        'Scene/BoundingBox'
    ],
    function(
        when,
        Projection,
        WMTS_Provider,
        WMS_Provider,
        KML_Provider,
        TileGeometry,
        CoordWMTS,
        Ellipsoid,
        BuilderEllipsoidTile,
        defaultValue,
        BoundingBox
    ) {

        function TileProvider(size,gLDebug) {
            //Constructor

            this.projection = new Projection();
            this.providerWMTS = new WMTS_Provider({support : gLDebug});//{url:"http://a.basemaps.cartocdn.com/",layer:"dark_all/"});
            //this.providerWMS     = new WMS_Provider();
            this.ellipsoid = new Ellipsoid(size);
            this.providerKML = new KML_Provider(this.ellipsoid);
            this.builder = new BuilderEllipsoidTile(this.ellipsoid,this.projection);


            this.providerElevationTexture = this.providerWMTS;
            this.providerColorTexture = this.providerWMTS;

            this.cacheGeometry = [];
            this.tree = null;
            this.nNode = 0;

            this.testWMS = new WMS_Provider({
                url: "http://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
                layer: "GEBCO_LATEST",
                srs: "EPSG:4326",
                format: "image/jpeg"
            });

        }

        TileProvider.prototype.constructor = TileProvider;

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

       // TileProvider.prototype.getKML= function(){
        TileProvider.prototype.getKML= function(tile){

            if(tile.link.layer.visible && tile.level  === 16)
            {
                var longitude   = tile.bbox.center.x / Math.PI * 180 - 180;
                var latitude    = tile.bbox.center.y / Math.PI * 180;

                return this.providerKML.loadKMZ(longitude, latitude).then(function (collada){

                    if(collada && tile.link.children.indexOf(collada) === -1)
                        {
                            tile.link.add(collada);
                            tile.content = collada;
                        }
                }.bind(this));
            }
        };

        TileProvider.prototype.executeCommand = function(command) {

            var tile = command.requester;//new command.type(params,this.builder);
            if(command.type === "geometry") {
                var bbox = tile.bbox;

                // TODO not generic
                var tileCoord = this.projection.WGS84toWMTS(bbox);
                var parent = tile.parent;
                //var parent = command.requester;

                // build tile
                var geometry; // = getGeometry(bbox,tileCoord);

                var params = {bbox:bbox,zoom:tileCoord.zoom,segment:16,center:null,projected:null};


                tile.setGeometry(new TileGeometry(params, this.builder), params.center);   //TODO: use cache?
                // set material too ?

                tile.tileCoord = tileCoord;
                tile.material.setUuid(this.nNode++);
                tile.link = parent.link;
                tile.geometricError = Math.pow(2, (18 - tileCoord.zoom));

                if (geometry) {
                    tile.rotation.set(0, (tileCoord.col % 2) * (Math.PI * 2.0 / Math.pow(2, tileCoord.zoom + 1)), 0);
                }

                parent.worldToLocal(params.center);

                tile.position.copy(params.center);
                tile.setVisibility(false);

                //parent.add(tile);
                tile.updateMatrix();
                tile.updateMatrixWorld();

                //if(tileCoord.zoom > 3 )
                    //tileCoord =  undefined;

                tile.texturesNeeded =+ 1;
            } else if(command.type === "elevation") {
                // TODO: remvoe hard-written values
                var elevationlayerId = tile.tileCoord.zoom > 11 ? 'IGN_MNT_HIGHRES' : 'IGN_MNT';
                this.providerElevationTexture.getElevationTexture(tile.tileCoord, elevationlayerId).then(function(terrain) {
                    if(this.disposed) return;
                    this.setTextureElevation(terrain);
                }.bind(tile));

            } else if(command.type === "imagery") {
                var box = {minCarto: {}, maxCarto: {}};
                box.minCarto.longitude = tile.bbox.minCarto.longitude * 180 / 3.14;
                box.minCarto.latitude = tile.bbox.minCarto.latitude * 180 / 3.14;
                box.maxCarto.longitude = tile.bbox.maxCarto.longitude * 180 / 3.14;
                box.maxCarto.latitude = tile.bbox.maxCarto.latitude * 180 / 3.14;
                box.minCarto.longitude -= 180;
                box.maxCarto.longitude -= 180;
                this.testWMS.getTexture(box).then(function(colorTexture) {
                    if(this.disposed) return;
                    colorTexture.level = this.level;
                    var pack = {};
                    pack.texture = colorTexture;
                    pack.pitch = {x: 0, y: 0, z: 1};
                    this.setTexturesLayer([pack], 1);
                }.bind(tile));
                /*var colorlayerId = command.paramsFunction.layer.colorLayerId;//'IGNPO';
                this.providerColorTexture.getColorTexture(tile.tileCoord,{x:0.0,y:0.0,z:1.0},colorlayerId).then(function(colorTextures) {
                    this.setTexturesLayer([colorTextures],1);
                }.bind(tile));*/
            }
        };

        /*var test = function (tile, f, callback) {

        };*/

        return TileProvider;

    });
