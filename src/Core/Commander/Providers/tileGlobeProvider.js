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



/* global THREE */

define('Core/Commander/Providers/tileGlobeProvider',[                        
            'Core/Geographic/Projection',
            'Core/Commander/Providers/WMTS_Provider',
            'Globe/EllipsoidTileGeometry',
            'Core/Geographic/CoordWMTS',
            'Core/Math/Ellipsoid',
            'Core/defaultValue',
            'Scene/BoudingBox'
            ],
             function(
                Projection,
                WMTS_Provider,
                EllipsoidTileGeometry,
                CoordWMTS,
                Ellipsoid,
                defaultValue,
                BoudingBox
                ){
                   
    function tileGlobeProvider(){
        //Constructor
       
       this.projection      = new Projection();
       this.providerWMTS    = new WMTS_Provider();       
       this.ellipsoid       = new Ellipsoid(6378137, 6378137, 6356752.3142451793);
       this.cacheGeometry   = [];
               
    }        

    tileGlobeProvider.prototype.constructor = tileGlobeProvider;
    
    tileGlobeProvider.prototype.get = function(command)
    {  
        var bbox    = command.paramsFunction[0];
        var cooWMTS = this.projection.WGS84toWMTS(bbox);        
        
        var parent  = command.requester;
        
        var geometryCache   = undefined;
        var n               = Math.pow(2,cooWMTS.zoom+1);       
        var part            = Math.PI * 2.0 / n;
        
        if(this.cacheGeometry[cooWMTS.zoom] !== undefined && this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] !== undefined)
        {            
                geometryCache = this.cacheGeometry[cooWMTS.zoom][cooWMTS.row];                
        }
        else
        {
            if(this.cacheGeometry[cooWMTS.zoom] === undefined)
                this.cacheGeometry[cooWMTS.zoom] = new Array() ;
           
            var precision   = 8;
        
            if(this.level > 11)
                precision   = 64;
            else if(this.level > 8)
                precision   = 32;
            else if (this.level > 6)
                precision   = 16;
            
                        
            var rootBBox    = new BoudingBox(0,part,bbox.minCarto.latitude, bbox.maxCarto.latitude );
            
            geometryCache   = new EllipsoidTileGeometry(rootBBox,precision,this.ellipsoid);
            this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] = geometryCache;    
                
        }
        
        var tile    = new command.type(bbox,cooWMTS,this.ellipsoid,parent/*,geometryCache*/);
   
        var translate   = new THREE.Vector3();
        var position    = new THREE.Vector3();
        var quatParent  = new THREE.Quaternion();
        var scale       = new THREE.Vector3();
                
        if(parent.worldToLocal !== undefined )
        {
            
            parent.updateMatrixWorld();
            
            parent.matrixWorld.decompose( position, quatParent, scale );            
            
            translate = parent.worldToLocal(tile.absoluteCenter.clone());
        }
   
        //tile.rotation.set ( 0, (cooWMTS.col%2)* part, 0 );
        tile.position.copy(translate);
                
        tile.visible = false;
        
        parent.add(tile);        
        
        return this.providerWMTS.getTextureBil(cooWMTS).then(function(result)
        {                           
            this.setTextureTerrain(result === - 1 ?  -1 : result.texture);
            
            return this;

        }.bind(tile)).then(function(tile)
        {                      
            if(cooWMTS.zoom >= 2)
            {            
                var box  = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS,tile.bbox); // 
                
                var id = 0;
                var col = box[0].col;
                
                tile.orthoNeed = box[1].row + 1 - box[0].row;

                for (var row = box[0].row; row < box[1].row + 1; row++)
                {                                                                        
                    var coo = new CoordWMTS(box[0].zoom,row,col);

                    this.providerWMTS.getTextureOrtho(coo,id).then
                    (
                        function(result)
                        {                          
                                                        
                            this.setTextureOrtho(result.texture,result.id);                            

                            return this;

                        }.bind(tile)
                    ).then( function(tile)
                    {                        
                        if(tile.orthoNeed === tile.tMat.Textures_01.length)
                        {                               
                            tile.loaded = true;
                            tile.tMat.update();
                            var parent = tile.parent;
                            
                            if(parent.childrenLoaded() && parent.wait === true)
                            {                                
                                parent.wait = false;                  
                            }
                        }                                           
                    }.bind(this)
                    );

                    id++;
                }  
            }
            else
            {
                tile.loaded = true;
                
                tile.tMat.update();
                
                var parent = tile.parent;

                if(parent.childrenLoaded() && parent.wait === true)
                {
                    parent.wait = false;                  
                }                
            }

        }.bind(this)); 
    };
          
                
    return tileGlobeProvider;                
                 
});