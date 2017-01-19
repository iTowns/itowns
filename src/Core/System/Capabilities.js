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
    return false || !!document.documentMode;
};

export default Capabilities;
