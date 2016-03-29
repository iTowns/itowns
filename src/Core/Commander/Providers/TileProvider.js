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
        'Core/Commander/Providers/KML_Provider',
        'Globe/TileGeometry',
        'Core/Geographic/CoordWMTS',
        'Core/Math/Ellipsoid',
        'Globe/BuilderEllipsoidTile',
        'Core/defaultValue',
        'Scene/BoundingBox',
        'three'
    ],
    function(
        when,
        Projection,
        WMTS_Provider,
        KML_Provider,
        TileGeometry,
        CoordWMTS,
        Ellipsoid,
        BuilderEllipsoidTile,
        defaultValue,
        BoundingBox,
        THREE
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

        var center = new THREE.Vector3();

        TileProvider.prototype.executeCommand = function(command) {

            var bbox = command.paramsFunction.bbox;
            var cooWMTS = this.projection.WGS84toWMTS(bbox);
            var parent = command.requester;
            var geometry = undefined; //getGeometry(bbox,cooWMTS);       

            var tile = new command.type(bbox, cooWMTS, this.builder, this.nNode++, geometry,parent.link,center);

            if (geometry) {
                tile.rotation.set(0, (cooWMTS.col % 2) * (Math.PI * 2.0 / Math.pow(2, cooWMTS.zoom + 1)), 0);            
            }

            parent.worldToLocal(center);

            tile.position.copy(center);          
            tile.setVisibility(false);
  
            parent.add(tile);
            tile.updateMatrix();
            tile.updateMatrixWorld();

            var layerId = cooWMTS.zoom > 11 ? 'IGN_MNT_HIGHRES' : 'IGN_MNT';
            
            if(cooWMTS.zoom > 3 )            
                cooWMTS =  undefined;
            
            tile.texturesNeeded =+ 1;


            return when.all([

                    this.providerElevationTexture.getElevationTexture(cooWMTS,layerId).then(function(terrain){                        
                                    
                        this.setTextureElevation(terrain);}.bind(tile)),

                    this.getColorTextures(tile).then(function(colorTextures){

                        this.setTexturesLayer(colorTextures,1);}.bind(tile))

                    //,this.getKML(tile)

                ]);            
        };

        TileProvider.prototype.getColorTextures = function(tile) {
                         
            if (tile.cooWMTS.zoom >= 2)
            {
                var promises = [];
                var box = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS, tile.bbox); //                 
                var col = box[0].col;
                tile.texturesNeeded += box[1].row + 1 - box[0].row;               
                
                for (var row = box[0].row; row < box[1].row + 1; row++) {
                                       
                    var cooWMTS = new CoordWMTS(box[0].zoom, row, col);                    
                    var pitch = new THREE.Vector3(0.0,0.0,1.0);
                    
                    if(box[0].zoom > 3)   
                    {
                        var levelParent = tile.getParentNotDownScaled(1).level + 1;                        
                        cooWMTS = this.projection.WMTS_WGS84Parent(cooWMTS,levelParent,pitch);
                    }
                                                            
                    promises.push(this.providerWMTS.getTextureOrtho(cooWMTS,pitch,'IGNPO'));                 
                }
                  
                return when.all(promises);
            }
            else             
                
                return when();            
            
        };

        return TileProvider;

    });
