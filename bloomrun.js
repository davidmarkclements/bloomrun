'use strict'

var Bucket = require('./lib/bucket')
var Iterator = require('./lib/iterator')
var PatternSet = require('./lib/patternSet')
var genKeys = require('./lib/genKeys')
var matchingBuckets = require('./lib/matchingBuckets')
var deepMatch = require('./lib/deepMatch')
var deepSort = require('./lib/deepSort')

function BloomRun (opts) {
  if (!(this instanceof BloomRun)) {
    return new BloomRun(opts)
  }

  this._isDeep = opts && opts.indexing === 'depth'
  this._buckets = []
  this._properties = new Set()
}

function addPatterns (toAdd) {
  this.filter.add(toAdd)
}

function addPatternSet (patternSet) {
  this.add(patternSet.pattern, patternSet.payload)
}

function removePattern (bucket, pattern, payload) {
  var foundPattern = false

  for (var i = 0; i < bucket.data.length; i++) {
    if (deepMatch(pattern, bucket.data[i].pattern)) {
      if (payload === null || payload === bucket.data[i].payload) {
        bucket.data.splice(i, 1)
        foundPattern = true

        removePattern(bucket, pattern, payload)
      }
    }
  }

  return foundPattern
}

function removeBucket (buckets, bucket) {
  for (var i = 0; i < buckets.length; i++) {
    if (bucket === buckets[i]) {
      buckets.splice(i, 1)
    }
  }
}

function removeProperty (key) {
  this.delete(key)
}

BloomRun.prototype.add = function (pattern, payload) {
  var buckets = matchingBuckets(this._buckets, pattern)
  var bucket
  var properties = this._properties

  if (buckets.length > 0) {
    bucket = buckets[0]
  } else {
    bucket = new Bucket()
    this._buckets.push(bucket)
  }

  genKeys(pattern).forEach(addPatterns, bucket)
  Object.keys(pattern).forEach(function (key) {
    properties.add(key)
  })

  var patternSet = new PatternSet(pattern, payload, this._isDeep)
  bucket.data.push(patternSet)

  if (this._isDeep) {
    bucket.data.sort(deepSort)
  }

  return this
}

BloomRun.prototype.remove = function (pattern, payload) {
  var matches = matchingBuckets(this._buckets, pattern)
  payload = payload || null

  if (matches.length > 0) {
    for (var i = 0; i < matches.length; i++) {
      var bucket = matches[i]

      if (removePattern(bucket, pattern, payload)) {
        removeBucket(this._buckets, bucket)

        Object.keys(pattern).forEach(removeProperty, this._properties)
        bucket.data.forEach(addPatternSet, this)
      }
    }
  }

  return this
}

BloomRun.prototype.lookup = function (pattern, opts) {
  var iterator = new Iterator(this, pattern, opts)
  return iterator.next()
}

BloomRun.prototype.list = function (pattern, opts) {
  var iterator = new Iterator(this, pattern, opts)
  var list = []
  var current = null

  while ((current = iterator.next()) !== null) {
    list.push(current)
  }

  return list
}

BloomRun.prototype.iterator = Iterator

module.exports = BloomRun
