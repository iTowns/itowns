/**
* Generated On: 2015-10-5
* Class: ApiGlobe
* Description: Classe façade pour attaquer les fonctionnalités du code.
*/


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe',['Core/Commander/Interfaces/EventsManager','Scene/Scene'], function(EventsManager,Scene){
  
    function ApiGlobe(){
        //Constructor

        this.commandsTree = null;

    }        

    ApiGlobe.prototype = new EventsManager();

    /**
    * @param Command
    */
    ApiGlobe.prototype.add = function(Command){
        //TODO: Implement Me 

    };


    /**
    * @param commandTemplate
    */
    ApiGlobe.prototype.createCommand = function(commandTemplate){
        //TODO: Implement Me 

    };

    /**
    */
    ApiGlobe.prototype.execute = function(){
        //TODO: Implement Me 

    };
    
    ApiGlobe.CreateSceneGlobe = function(){
    //TODO: Normalement la création de scene ne doit pas etre ici....
    // à deplacer plus tard
     return new Scene();

    };
    
    return ApiGlobe;

});

