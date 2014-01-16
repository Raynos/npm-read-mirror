var test = require("tape")

var npmReadMirror = require("../index")

test("npmReadMirror is a function", function (assert) {
    assert.equal(typeof npmReadMirror, "function")
    assert.end()
})
