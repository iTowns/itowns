/**
* Generated On: 2015-10-5
* Class: Provider
* Description: Cette classe générique permet de fournir des données distantes ou locales, des Nodes ou des services.
*/

function Provider(){
    //Constructor

    this.type = null;
    this._IODriver = null;

}


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



module.exports = {Provider:Provider};