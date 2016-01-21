/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

/**
 * 
 * @param {type} tileGlobeProvider
 * @param {type} EventsManager
 * @param {type} PriorityQueue
 * @param {type} when
 * @param {type} EllipsoidTileMesh
 * @param {type} CoordCarto
 * @param {type} THREE
 * @returns {Function}
 */
define('Core/Commander/ManagerCommands',
        [               
            'Core/Commander/Providers/tileGlobeProvider',
            'Core/Commander/Interfaces/EventsManager',
            'PriorityQueue',
            'when',
            'Globe/EllipsoidTileMesh',
            'Core/Geographic/CoordCarto',
            'THREE'
        ], 
        function(
                tileGlobeProvider,
                EventsManager,
                PriorityQueue,
                when,
                EllipsoidTileMesh,
                CoordCarto,
                THREE
        ){

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
        //        
        this.eventsManager  = new EventsManager();       
        this.scene          = undefined;
        this.nbRequest      = -3; // TODO why???

    }        

    ManagerCommands.prototype.constructor = ManagerCommands;

    ManagerCommands.prototype.addCommand = function(command)
    {                      
        this.queueAsync.queue(command);        
        this.nbRequest++;
     
//        if(this.queueAsync.length > 8 )
//        {
//            this.runAllCommands();          
//        }            
    };
    
    ManagerCommands.prototype.init = function(scene)
    {
        this.scene = scene;       
    };
    
    ManagerCommands.prototype.createProvider = function(type,param)
    {               
        if(type === EllipsoidTileMesh)
        {                       
            this.providers.push(new tileGlobeProvider(param));
            
            this.providers[0].providerKML.loadTestCollada().then(function (result){

                var child = result.scene.children[0].children[0].children[0];
                var position = this.providers[0].ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,/*25000000 - 100*/50));                                
                child.position.copy(position);
                child.updateMatrix();
                child.frustumCulled = false; 
                
                this.scene.gfxEngine.scene3D.add(child);
 
            }.bind(this));
        }
    };
        
    ManagerCommands.prototype.runAllCommands = function()
    {  
        if(this.queueAsync.length === 0)
        {    
            this.process();
            return when();
        }
        
        return this.providers[0].get(this.queueAsync.dequeue()).then(function()
        {           
            
            this.runAllCommands();
            this.nbRequest--;
            
            if(this.nbRequest === 0)
            {                                
                this.scene.updateScene3D();
            }                            
           
        }.bind(this));                         
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
        if(this.scene !== undefined)
            this.scene.renderScene3D();
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