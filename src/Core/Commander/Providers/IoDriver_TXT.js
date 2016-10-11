/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/* global */

import IoDriver from 'Core/Commander/Providers/IoDriver';


function IoDriver_TXT() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_TXT.prototype = Object.create(IoDriver.prototype);

IoDriver_TXT.prototype.constructor = IoDriver_TXT;

IoDriver_TXT.prototype.read = function(url) {
    // We don't use fetch here because there no direct
    // equivalent to responseType="document"
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.open("GET", url, true);

        xhr.crossOrigin = '';

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                throw new Error(`Error loading ${url}: status ${xhr.status}`);
            }
            resolve(xhr.responseText);
        };

        xhr.onerror = () => reject(Error("Error IoDriver_TXT"));

        xhr.send(null);
    });

};

export default IoDriver_TXT;
