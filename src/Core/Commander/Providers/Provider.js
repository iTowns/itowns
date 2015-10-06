/**
* Generated On: 2015-10-5
* Class: Provider
* Description: Cette classe générique permet de fournir des données distantes ou locales, des Nodes ou des services.
*/

define('Core/Commander/Providers/Provider',[], function(){


    function Provider(iodriver){
        //Constructor

        this.type       = null;
        this._IoDriver  = iodriver;

    }
    
    Provider.prototype.constructor = Provider;

    /**
    * @param url
    */
    Provider.prototype.get = function(url){
        //TODO: Implement Me 

    };


    /**
    * @param url
    */
    Provider.prototype.getInCache = function(url){
        //TODO: Implement Me 

    };
    
    return Provider;
    
});