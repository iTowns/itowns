/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import IoDriver from 'Core/Commander/Providers/IoDriver';


function IoDriver_JSON() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_JSON.prototype = Object.create(IoDriver.prototype);

IoDriver_JSON.prototype.constructor = IoDriver_JSON;

IoDriver_JSON.prototype.read = function(url) {
    return fetch(url).then(response => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.json();
    });
};

export default IoDriver_JSON;
