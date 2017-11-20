/* global describe, it */
const support = require('./support');


describe('postprocessing.html', function () {
    it('Should load and run', function () {
        support.basicTest('examples/postprocessing.html');
    });
});
