/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

/**
 * 
 * @param {type} WMTS_Provider
 * @param {type} EventsManager
 * @param {type} Queue
 * @returns {Function}
 */
define('Core/Commander/ManagerCommands',
        [   'Core/Commander/Providers/WMTS_Provider',
            'Core/Commander/Interfaces/EventsManager',
            'PriorityQueue',
            'Core/Commander/Command',
            'text!Renderer/Shader/GlobeVS.glsl',
            'text!Renderer/Shader/GlobePS.glsl',
            'Core/Geographic/CoordWMTS'            
        ], 
        function(
                WMTS_Provider,
                EventsManager,
                PriorityQueue,
                Command,
                GlobeVS,
                GlobePS,
                CoordWMTS){

    var instanceCommandManager = null;   
    
    function ManagerCommands(){
        //Constructor
        if(instanceCommandManager !== null){
            throw new Error("Cannot instantiate more than one ManagerCommands");
        } 
        
        this.queueAsync     = new PriorityQueue({ comparator: function(a, b) { return b.priority - a.priority; }});        
        this.queueSync      = null;
        this.loadQueue      = [];
        this.providers      = [];
        this.history        = null;        
        this.providers.push(new WMTS_Provider());        
        this.countRequest   = 0;   
        this.eventsManager  = new EventsManager();       
        this.scene          = undefined;
        
    }        

    ManagerCommands.prototype.constructor = ManagerCommands;

    ManagerCommands.prototype.addCommand = function(command)
    {                      
        this.queueAsync.queue(command);
     
        if(this.queueAsync.length > 16 )
        {
            this.runAllCommands();
        }            
    };
    
    ManagerCommands.prototype.runAllCommands = function()
    {  
        while (this.queueAsync.length > 0)
        {
            //
            
            var command = this.queueAsync.dequeue();
            
            //console.log(command.priority);
            
            var bbox    = command.paramsFunction[0];
            var cooWMTS = command.paramsFunction[1];            
            var projection = command.paramsFunction[2];
            var parent  = command.requester;
            var tile    = new command.type(bbox,cooWMTS);     
            
            parent.add(tile);
         
            this.getTextureBil(cooWMTS).then(function(texture)
            {   
                this.setTextureTerrain(texture);                
                return this;

            }.bind(tile)).then(function(tile)
            {                      
                if(cooWMTS.zoom >= 2)
                {
                    
                    var box  = projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS,tile.bbox); // 
                      
                    //console.log(box);
                    var id = 0;
                    var col = box[0].col;
                    
                    for (var row = box[0].row; row < box[1].row + 1; row++)
                    {                                                                        
                        var coo = new CoordWMTS(box[0].zoom,row,col);
                        
                        this.getTextureOrtho(coo).then
                        (
                            function(texture)
                            {                             
                                                
                                this.setTextureOrtho(texture,id);
                                 
                                return this;

                            }.bind(tile)
                        ).then( function(tile)
                        {
                            //if(tile.parent.childrenCount() > 4)
                            //    console.log("finished");
                            
                            //console.log(parent);
                            //parent.add(tile);
                        }.bind(this)
                        );

                        id++;
                        
                    }  
                }

            }.bind(this)); 
        }
//        console.log('----------------');
    };

    ManagerCommands.prototype.requestInc = function()
    {
      
        this.countRequest++;
        
    };
    
    ManagerCommands.prototype.requestDec = function()
    {
      
        this.countRequest--;
        
        if(this.countRequest <= 0)                    
        {
            this.countRequest = 0;
            this.scene.gfxEngine.update();
        }                
    };

    /**
     * 
     * @param {type} coWMTS
     * @returns {ManagerCommands_L7.ManagerCommands.prototype@arr;providers@call;getTile}
     */
    ManagerCommands.prototype.getTextureBil = function(cooWMTS){
        
        //var co = new command(Math.floor((Math.random()*100)));        
        //this.queueAsync.insert(co);
      

        this.requestInc();
        return this.providers[0].getTextureBil(cooWMTS);

    };
    
    ManagerCommands.prototype.getTextureOrtho = function(coWMTS){
                        
        this.requestInc();
        
        return this.providers[0].getTextureOrtho(coWMTS);
    };
    
    ManagerCommands.prototype.getTile = function(bbox,level)
    {
        //return this.getTile(type,bbox,level);
    };

    /**
    */
    ManagerCommands.prototype.sortByPriority = function(){
        //TODO: Implement Me 

    };

    /**
    */
    ManagerCommands.prototype.removeCanceled = function(){
        //TODO: Implement Me 

    };
    
    /**
    */
    ManagerCommands.prototype.wait = function(){
        //TODO: Implement Me 
        this.eventsManager.wait();
    };


    /**
    */
    ManagerCommands.prototype.process = function(){
        //TODO: Implement Me 
        this.scene.updateScene3D();
    };


    /**
    */
    ManagerCommands.prototype.forecast = function(){
        //TODO: Implement Me 

    };


    /**
    * @param object
    */
    ManagerCommands.prototype.addInHistory = function(object){
        //TODO: Implement Me 

    };

    return function(){
        instanceCommandManager = instanceCommandManager || new ManagerCommands();
        return instanceCommandManager;
    };
    
});