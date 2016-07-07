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
        'THREE',
        'Core/Geographic/Projection',
        'Core/Commander/Providers/WMTS_Provider',
        'Core/Commander/Providers/KML_Provider',
        'Core/Commander/Providers/WMS_Provider',
        'Globe/TileGeometry',
        'Core/Geographic/CoordWMTS',
        'Core/Math/Ellipsoid',
        'Globe/BuilderEllipsoidTile',
        'Core/defaultValue',
        'Scene/BoundingBox'
    ],
    function(
        when,
        THREE,
        Projection,
        WMTS_Provider,
        KML_Provider,
        WMS_Provider,
        TileGeometry,
        CoordWMTS,
        Ellipsoid,
        BuilderEllipsoidTile,
        defaultValue,
        BoundingBox
    ) {

        function TileProvider(size,manager,gLDebug) {
            //Constructor

            this.projection = new Projection();
            this.providerWMTS = new WMTS_Provider({support : gLDebug});
            this.ellipsoid = new Ellipsoid(size);
            this.providerKML = new KML_Provider(this.ellipsoid);
            this.builder = new BuilderEllipsoidTile(this.ellipsoid,this.projection);
            this.providerWMS = new WMS_Provider({support : gLDebug});

            this.providerElevationTexture = this.providerWMTS;
            this.providerColorTexture = this.providerWMTS;
            this.manager = manager;

            this.cacheGeometry = [];
            this.tree = null;
            this.nNode = 0;

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

        // 52.0.2739.0 dev (64-bit)
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
            tile.setVisibility(false);

            parent.add(tile);
            tile.updateMatrix();
            tile.updateMatrixWorld();

            var map = command.paramsFunction.layer.parent;
            var elevationServices = map.elevationTerrain.services;
            var colorServices = map.colorTerrain.services;

            tile.matrixSet = [];

            // TODO passer mes layers colors?
            var textureCount = 0;
            var paramMaterial = [];
            var providersColor = [];
            var providerServices = [];

            for (var i = 0; i < map.colorTerrain.children.length; i++)
            {

                var layerView = map.colorTerrain.children[i];
                var provider = this.manager.getProvider(layerView);
                var service = layerView.services[0];
                var layerData = provider.layersData[service];
                var tileMatrixSet = layerData.tileMatrixSet;

                if(!tile.matrixSet[tileMatrixSet])
                    tile.matrixSet[tileMatrixSet] = this.projection.getCoordWMTS_WGS84(tile.tileCoord, tile.bbox,tileMatrixSet);

                // if you make specific things depending on provider
                // if(provider instanceof WMTS_Provider)
                //     console.log('is WMTS_Provider');

                console.log(service,layerView)
                if (provider.tileInsideLimit(tile, layerData)) {

                    var idProv = providersColor.indexOf(provider);
                    if(idProv<0)
                    {
                        providersColor.push(provider);
                        providerServices[providersColor.length-1] = [service];

                    }
                    else
                        providerServices[idProv].push(service);

                    var bcoord = tile.matrixSet[tileMatrixSet];

                    paramMaterial.push({
                        tileMT: tileMatrixSet,
                        pit: textureCount,
                        visible: map.colorTerrain.children[i].visible ? 1 : 0,
                        opacity: map.colorTerrain.children[i].opacity || 1.0,
                        fx: layerData.fx,
                        idLayer: colorServices[i]
                    });

                    textureCount += bcoord[1].row - bcoord[0].row + 1;
                }
            }

            tile.setColorLayerParameters(paramMaterial );
            tile.texturesNeeded += textureCount;

            var requests = [this.providerElevationTexture.getElevationTexture(tile,elevationServices).then(function(terrain){
                            this.setTextureElevation(terrain);}.bind(tile))];

            for (var key in providersColor)
            {
                requests.push(providersColor[key].getColorTextures(tile,providerServices[key]).then(function(colorTextures){

                        this.setTexturesLayer(colorTextures,1);}.bind(tile)));
            }

            requests.push(this.getKML(tile));

            return when.all(requests).then(function() {
                return command.resolve(tile);
            });
        };

        return TileProvider;

    });
