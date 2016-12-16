/**
 * Generated On: 2015-10-5
 * Class: Capabilities
 */

function Capabilities() {
    // Constructor

    this._systemCap = null;
    this._gpuCap = null;
}


/**
 */
Capabilities.prototype.getSystemCapabilities = function getSystemCapabilities() {
    // TODO: Implement Me
    /*
    var memory = window.performance.memory;
    console.log(memory.totalJSHeapSize / (1024 * 1024) + '/' + memory.jsHeapSizeLimit / (1024 * 1024));
    */
};


/**
 */
Capabilities.prototype.getGpuCapabilities = function getGpuCapabilities() {
    // TODO: Implement Me

};


/**
 */
Capabilities.prototype.ioFile = function ioFile() {
    // TODO: Implement Me

};

Capabilities.prototype.isInternetExplorer = function isInternetExplorer() {
    return /* @cc_on!@*/ false || !!document.documentMode;
};
/*
    Capabilities.prototype.checkVersion = functioncheckVersion()
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
export default Capabilities;
