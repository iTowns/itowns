/**
* Generated On: 2015-10-5
* Class: Map
* Description: Map est un calque de données cartographique. Il possède un quadtree et un system de projection.
*/


define('Globe/Map',['Scene/Layer'], function(Layer){


    function Map(managerCommand){
        //Constructor
        Layer.call( this,managerCommand );
        this.projection = null;
        this.quatree    = null;
        
        
    };

    Map.prototype = Object.create( Layer.prototype );

    Map.prototype.constructor = Map;

    return Map;
    
});