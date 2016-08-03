/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/* global */

import IoDriver from 'Core/Commander/Providers/IoDriver';


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

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                throw new Error(`Error loading ${url}: status ${xhr.status}`);
            }
            resolve(xhr.response);
        };

        xhr.onerror = () => reject(Error("Error IoDriverXML"));

        xhr.send(null);
    });

};

export default IoDriverXML;
