/**
* Generated On: 2015-10-5
* Class: Capabalities
*/

define('Core/System/Capabalities',[], function(){


    function Capabalities(){
        //Constructor

        this._systemCap = null;
        this._gpuCap = null;

    }


    /**
    */
    Capabalities.prototype.getSystemCapabilities = function(){
        //TODO: Implement Me 

    };


    /**
    */
    Capabalities.prototype.getGpuCapabilities = function(){
        //TODO: Implement Me 

    };


    /**
    */
    Capabalities.prototype.ioFile = function(){
        //TODO: Implement Me 

    };

    Capabalities.prototype.isInternetExplorer = function()    
    {

        return /*@cc_on!@*/false || !!document.documentMode;

    };  
    /*
    Capabalities.prototype.checkVersion = function()
    {
      var msg = "You're not using Internet Explorer.";
      var ver = getInternetExplorerVersion();

      if ( ver > -1 )
      {
        if ( ver >= 8.0 ) 
          msg = "You're using a recent copy of Internet Explorer.";
        else
          msg = "You should upgrade your copy of Internet Explorer.";
      }
      alert( msg );
    };
   */
    return Capabalities;
});