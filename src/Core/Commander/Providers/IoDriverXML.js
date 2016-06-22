/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/* global */

define('Core/Commander/Providers/IoDriverXML', ['Core/Commander/Providers/IoDriver'], function(IoDriver) {


    function IoDriverXML() {
        //Constructor
        IoDriver.call(this);

    }

    IoDriverXML.prototype = Object.create(IoDriver.prototype);

    IoDriverXML.prototype.constructor = IoDriverXML;

    IoDriverXML.prototype.read = function(url) {
        // We don't use fetch here because there no direct
        // equivalent to responseType="document"
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);

            xhr.responseType = "document";

            xhr.crossOrigin = '';

            xhr.onload = function() {
                resolve(this.response);

            };

            xhr.onerror = function() {

                reject(Error("Error IoDriverXML"));

            };

            xhr.send(null);
        });

    };

    return IoDriverXML;

});
