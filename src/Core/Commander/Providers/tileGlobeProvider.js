/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/Commander/Providers/tileGlobeProvider',[                        
            'Core/Geographic/Projection',
            'Core/Commander/Providers/WMTS_Provider',
            'Core/Geographic/CoordWMTS'
            ],
             function(
                Projection,
                WMTS_Provider,
                CoordWMTS){
                   
    function tileGlobeProvider(){
        //Constructor
       this.projection      = new Projection();
       this.providerWMTS    = new WMTS_Provider();
        
    }        

    tileGlobeProvider.prototype.constructor = tileGlobeProvider;
    
    tileGlobeProvider.prototype.get = function(command)
    {  
        var bbox    = command.paramsFunction[0];
        var cooWMTS = this.projection.WGS84toWMTS(bbox);        
        
        var parent  = command.requester;
        var tile    = new command.type(bbox,cooWMTS);     

        parent.add(tile);

        this.providerWMTS.getTextureBil(cooWMTS).then(function(texture)
        {   
                        
            this.setTextureTerrain(texture);                
            return this;

        }.bind(tile)).then(function(tile)
        {                      
            if(cooWMTS.zoom >= 2)
            {
            
                var box  = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS,tile.bbox); // 
                
                var id = 0;
                var col = box[0].col;

                for (var row = box[0].row; row < box[1].row + 1; row++)
                {                                                                        
                    var coo = new CoordWMTS(box[0].zoom,row,col);

                    this.providerWMTS.getTextureOrtho(coo).then
                    (
                        function(texture)
                        {                             
                          
                            this.setTextureOrtho(texture,id);

                            return this;

                        }.bind(tile)
                    ).then( function(tile)
                    {

                    }.bind(this)
                    );

                    id++;

                }  
            }

        }.bind(this)); 
    };
          
                
    return tileGlobeProvider;                
                 
});