/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('Core/Commander/Providers/IoDriver_JSON', ['Core/Commander/Providers/IoDriver'], function(IoDriver) {


    function IoDriver_JSON() {
        //Constructor
        IoDriver.call(this);

    }

    IoDriver_JSON.prototype = Object.create(IoDriver.prototype);

    IoDriver_JSON.prototype.constructor = IoDriver_JSON;

    IoDriver_JSON.prototype.read = function(url) {
        return fetch(url).then(function(response) {
            return response.json();
        });
    };

    return IoDriver_JSON;

});
