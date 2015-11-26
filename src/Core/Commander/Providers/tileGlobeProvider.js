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
            'Core/Geographic/CoordWMTS',
            'Core/Math/Ellipsoid',
            'OBBHelper'
            ],
             function(
                Projection,
                WMTS_Provider,
                CoordWMTS,
                Ellipsoid,
                OBBHelper){
                   
    function tileGlobeProvider(){
        //Constructor
       
       this.projection      = new Projection();
       this.providerWMTS    = new WMTS_Provider();       
       this.ellipsoid       = new Ellipsoid(6378137, 6378137, 6356752.3142451793);
               
    }        

    tileGlobeProvider.prototype.constructor = tileGlobeProvider;
    
    tileGlobeProvider.prototype.get = function(command)
    {  
        var bbox    = command.paramsFunction[0];
        var cooWMTS = this.projection.WGS84toWMTS(bbox);        
        
        var parent  = command.requester;
        var tile    = new command.type(bbox,cooWMTS,this.ellipsoid,parent);      
        
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