/**
* Generated On: 2015-10-5
* Class: CacheRessource
* Description: Cette classe singleton est un cache des ressources et services
*/

define('Core/Commander/Providers/CacheRessource',[], function(){
 
    var instanceCache = null;

    function CacheRessource(){
        //Constructor

        this.cacheObjects = [];
        this._maximumSize = null;

    }

    /**
    * @param url
    */
    CacheRessource.prototype.getRessource = function(url){
        //TODO: Implement Me 
        
        return undefined;
        return this.cacheObjects[url];

    };
    
    CacheRessource.prototype.addRessource = function(url,ressource){
        
        this.cacheObjects[url] = ressource;
        
    };


    /**
    * @param id
    */
    CacheRessource.prototype.getRessourceByID = function(id){
        //TODO: Implement Me 

    };

    return function(){
        instanceCache = instanceCache || new CacheRessource();
        return instanceCache;
    };

});
