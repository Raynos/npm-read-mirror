var mkdirp = require("mkdirp")
var request = require("request")
var path = require("path")
var fs = require("fs")
var format = require("util").format

function exists(location, callback) {
    fs.exists(location, function (bool) {
        callback(null, bool)
    })
}

module.exports = Mirror

function* Mirror(opts) {
    var source = opts.source || "https://isaacs.iriscouch.org"
    var destination = opts.destination || path.join(__dirname, "npm")
    var logger = opts.logger

    yield mkdirp.bind(null, destination)
    var index = yield* fetchPackageIndex(source, destination)

    yield index.map(function* (tuple) {
        var name = tuple[0]
        var revision = tuple[1]

        var writeLoc = path.join(destination, name)
        var packageLoc = path.join(writeLoc, "package.json")
        if (yield exists.bind(null, packageLoc)) {
            var package = JSON.parse(fs.readFile.bind(null, packageLoc))
            // if we have a package.json in the destination
            // whose's rev is the current rev then exit
            if (package._rev === revision) {
                return
            }
        }

        logger.log("fetching package info %s", name)
        var info = yield* getPackageInfo(source, name, logger)
        if (!info) {
            return logger.warn("Unable to get info for %s", name)
        }

        if (!yield exists.bind(null, writeLoc)) {
            yield mkdirp.bind(null, writeLoc)
        }

        if (!info.versions) {
            return logger.warn("No versions field in package info for %s", name)
        }

        yield Object.keys(info.versions).map(function* (version) {
            var versionInfo = info.versions[version]
            
            
        })
    })
}

function* npmRequest(uri) {
    var res = yield request.bind(null, {
        uri: uri,
        headers: {
            "User-agent": "node/0.8.11 linux x64"
        },
        json: true
    })
    return res.body
}

function* fetchPackageIndex(source, destination) {
    var uri = format("%s/registry/_all_docs", source)

    var body = yield* npmRequest(uri)
    var packages = body.rows
    packages = body.rows.reduce(function (acc, row) {
        if (!row.key ||
            row.key.substr(0, 7) === "_design" ||
            row.key === "error: forbidden"
        ) {
            return acc
        }

        acc.push([row.key, row.value.rev])
        return acc
    }, [])

    yield fs.writeFile.bind(null,
        path.join(destination, "revisions.json"),
        JSON.stringify(packages))

    var short = packages.map(function (tuple) {
        return tuple[0]
    })

    yield fs.writeFile.bind(null,
        path.join(destination, "index.json"),
        JSON.stringify(short))

    return packages
}

function* getPackageInfo(source, name, logger) {
    var uri = format("%s/registry/%s", source, name)
    var tuple = yield { both: npmRequest(uri) }

    if (tuple[0]) {
        logger.warn("could not request module %s with error %s",
            name, tuple[0].message)
    }

    return tuple[1] || null
}
