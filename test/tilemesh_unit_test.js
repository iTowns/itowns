/* global describe, it */
import TileMesh from '../src/Core/TileMesh';

const assert = require('assert');

// It is relatively long to create TileMesh on the go (in term of code), so we
// emulate a fake one with the necessary informations in it.
function FakeTileMesh(level, parent) {
    this.id = Math.random().toString(36);
    this.level = level;
    this.parent = parent;
}
FakeTileMesh.prototype = Object.create({});
FakeTileMesh.prototype.constructor = FakeTileMesh;
FakeTileMesh.prototype.findCommonAncestor = TileMesh.prototype.findCommonAncestor;

const tree = [
    [new FakeTileMesh(0)],
];

// root + three levels
for (let i = 1; i < 4; i++) {
    tree[i] = [];
    // four child per parent
    for (let j = 0; j < Math.pow(4, i); j++) {
        const tile = new FakeTileMesh(i, tree[i - 1][~~(j / 4)]);
        tree[i].push(tile);
    }
}

describe('TileMesh', function () {
    it('should find the correct common ancestor between two tiles of same level', function () {
        const res = tree[2][0].findCommonAncestor(tree[2][1]);
        assert.equal(res, tree[1][0]);
    });

    it('should find the correct common ancestor between two tiles of different level', function () {
        const res = tree[2][0].findCommonAncestor(tree[3][4]);
        assert.equal(res, tree[1][0]);
    });

    it('should find the correct common ancestor between two tiles to be the first one', function () {
        const res = tree[2][0].findCommonAncestor(tree[3][0]);
        assert.equal(res, tree[2][0]);
    });

    it('should find the correct common ancestor between two tiles to be the root', function () {
        const res = tree[3][60].findCommonAncestor(tree[2][0]);
        assert.equal(res, tree[0][0]);
    });
});
