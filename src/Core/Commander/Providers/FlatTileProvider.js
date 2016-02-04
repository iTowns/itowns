/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global THREE */

define('Core/Commander/Providers/FlatTileProvider',[
            'when',
            'Core/Geographic/Projection',
            'Core/Commander/Providers/WMTS_Provider',
            'Flat/FlatTileGeometry',
            'Core/Geographic/CoordWMTS',
            'Core/Math/Ellipsoid',
            'Core/defaultValue',
            'Scene/BoudingBox'                        
            ],
             function(
                when,
                Projection,
                WMTS_Provider,
                FlatTileGeometry,
                CoordWMTS,
                Ellipsoid,
                defaultValue,
                BoudingBox
                ){
                   
    function FlatTileProvider(srid){
       //Constructor
       if (srid === undefined) throw new Error();
       
       
       this.srid = srid;
       this.projection      = new Projection();
       this.providerWMTS    = new WMTS_Provider();
       this.cacheGeometry   = [];
       this.tree            = null;
       
       this.nNode           = 0;
               
    }        

    FlatTileProvider.prototype.constructor = FlatTileProvider;
    
    FlatTileProvider.prototype.get = function(command)
    {  
        if(command === undefined)
            return when();
        
        var bbox        = command.paramsFunction[0];

        var cooWMTS     = this.projection.WGS84toWMTS(bbox);                
        var parent      = command.requester;        
        var geometry    = undefined; //getGeometry(bbox,cooWMTS);       
        var tile        = new command.type(bbox,this.nNode++,geometry);        
        
        var translate   = new THREE.Vector3();
             
        if(parent.worldToLocal)                
            translate = parent.worldToLocal(tile.absoluteCenter.clone());                    
                   
        tile.position.copy(translate);        
        tile.updateMatrixWorld();

        tile.setVisibility(false);
        
        parent.add(tile);
                        
        return tile;
    };
    
    FlatTileProvider.prototype.getOrthoImages = function(tile)
    {         
        var box        = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS,tile.bbox); // 
        var id         = 0;
        var col        = box[0].col;                
        tile.orthoNeed = box[1].row + 1 - box[0].row;
     
        for (var row = box[0].row; row < box[1].row + 1; row++)
        {                                                                        
            this.providerWMTS.getTextureOrtho(new CoordWMTS(box[0].zoom,row,col),id).then
            (
                function(result)
                {                                                                                  
                    this.setTextureOrtho(result.texture,result.id);                                                     

                }.bind(tile)
            );

            id++;
        }  
        
    };
                          
    return FlatTileProvider;                
                 
});
