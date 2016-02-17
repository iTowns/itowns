/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import IoDriver from 'Core/Commander/Providers/IoDriver';
import when from 'when';


function IoDriverXML() {
    //Constructor
    IoDriver.call(this);

}

IoDriverXML.prototype = Object.create(IoDriver.prototype);

IoDriverXML.prototype.constructor = IoDriverXML;

IoDriverXML.prototype.read = function(url) {

    var deferred = when.defer();

    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);

    xhr.responseType = "document";

    xhr.crossOrigin = '';

    xhr.onload = function() {
        deferred.resolve(this.response);

    };

    xhr.onerror = function() {

        deferred.reject(Error("Error IoDriverXML"));

    };

    xhr.send(null);

    return deferred;


};

export default IoDriverXML;
