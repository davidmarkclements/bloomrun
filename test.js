'use strict'

var test = require('tape')
var bloomrun = require('./')

test('null is returned if pattern is not found', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { cmd: 'set-policy' }

  t.equal(instance.lookup(pattern), null)
})

test('pattern is returned on match', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { cmd: 'set-policy' }

  instance.add(pattern)

  t.deepEqual(instance.lookup(pattern), pattern)
})

test('payload is returned instead of pattern if it exists', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { prefs: 'userId' }
  var payload = '1234'

  instance.add(pattern, payload)

  t.deepEqual(instance.lookup(pattern), payload)
})

test('regexp support in the lookup', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { cmd: 'save', prefs: 'userId' }
  var payload = '1234'

  instance.add(pattern, payload)

  t.deepEqual(instance.lookup({ cmd: 'save', prefs: /user.*/ }), payload)
})

test('regexp support in the pattern', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { cmd: 'save', prefs: /user.*/ }
  var payload = '1234'

  instance.add(pattern, payload)

  t.deepEqual(instance.lookup({ cmd: 'save', prefs: 'userId' }), payload)
})

test('deep pattern matching', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { role: 'sum', tnx: { side: 'buy' } }
  var payload = '1234'

  instance.add(pattern, payload)

  t.deepEqual(instance.lookup({
    role: 'sum',
    tnx: {
      side: 'buy',
      amount: 100
    }
  }), payload)
})

test('functions are supported as payloads', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { prefs: 'userId' }
  var payload = function () { return '1234' }

  instance.add(pattern, payload)

  t.deepEqual(instance.lookup(pattern)(), payload())
})

test('partial matching should not be supported', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = {
    cmd: 'add-user',
    username: 'mcollina'
  }

  instance.add(pattern)

  t.notOk(instance.lookup({ cmd: 'add-user' }))
  t.notOk(instance.lookup({ username: 'mcollina' }))
})

// see https://github.com/mcollina/bloomrun/issues/18
test('do not match if not fully matching - #18', function (t) {
  t.plan(1)

  var instance = bloomrun()

  instance.add({ role: 'auth', cmd: 'login' }, 42)

  instance.add({ role: 'auth', query: 'isAuthenticated' }, 24)

  t.equal(instance.lookup({
    role: 'auth', query: 'isAuthenticated'
  }), 24)
})

test('multiple matches are supported', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var firstPattern = {
    group: '123',
    userId: 'ABC'
  }
  var secondPattern = {
    group: '123',
    userId: 'ABC'
  }

  instance.add(firstPattern)
  instance.add(secondPattern)

  t.deepEqual(instance.list({ group: '123', userId: 'ABC' }), [firstPattern, secondPattern])
})

test('iterator based retrieval is supported', function (t) {
  t.plan(3)

  var instance = bloomrun()
  var pattern1 = { hello: 'world' }
  var pattern2 = { hello: 'world' }

  instance.add(pattern1)
  instance.add(pattern2)

  var iterator = instance.iterator({ hello: 'world' })

  t.equal(iterator.next(), pattern1)
  t.equal(iterator.next(), pattern2)

  t.notOk(iterator.next())
})

test('removing patterns is supported', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = { group: '123' }

  instance.add(pattern)

  t.deepEqual(instance.lookup({ group: '123' }), pattern)

  instance.remove(pattern)

  t.equal(instance.lookup({ group: '123' }), null)
})

test('remove deletes all matches', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = { group: '123' }

  instance.add(pattern)
  instance.add(pattern, 'TEST')

  t.deepEqual(instance.list({ group: '123' }), [pattern, 'TEST'])

  instance.remove(pattern)

  t.equal(instance.lookup({ group: '123' }), null)
})

test('payload is considered when removing', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = { group: '123' }

  instance.add(pattern, 'XYZ')
  instance.add(pattern, '567')

  t.deepEqual(instance.list({ group: '123' }), ['XYZ', '567'])

  instance.remove(pattern, '567')

  t.equal(instance.lookup({ group: '123' }), 'XYZ')
})

test('complex payloads are matched correctly', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = { group: '123' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern, payloadOne)
  instance.add(pattern, payloadTwo)
  instance.add(pattern, '567')

  t.deepEqual(instance.list({ group: '123' }), [payloadOne, payloadTwo, '567'])

  instance.remove(pattern, payloadOne)
  instance.remove(pattern, payloadTwo)

  t.equal(instance.lookup({ group: '123' }), '567')
})

test('removing causes filters to be rebuilt', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var firstPattern = { group: '123' }
  var secondPattern = { group: '123' }

  instance.add(firstPattern, 42)
  instance.add(secondPattern, 24)

  t.equal(instance.lookup({ group: '123' }), 42)

  instance.remove(firstPattern, 42)

  t.equal(instance.lookup({ group: '123' }), 24)
})

test('patterns can be listed while using payloads', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern = { group: '123' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern, payloadOne)
  instance.add(pattern, payloadTwo)

  t.deepEqual(instance.list({ group: '123' }, { patterns: true }), [pattern, pattern])
})

test('patterns can be looked up while using payloads', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern1 = { group: '123' }
  var pattern2 = { group: '123' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.equal(instance.lookup({ group: '123' }, { patterns: true }), pattern1)
})

test('iterators can be used to fetch only patterns', function (t) {
  t.plan(3)

  var instance = bloomrun()
  var pattern1 = { group: '123' }
  var pattern2 = { group: '123' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  var iterator = instance.iterator({ group: '123' }, { patterns: true })

  t.equal(iterator.next(), pattern1)
  t.equal(iterator.next(), pattern2)
  t.equal(iterator.next(), null)
})

test('listing all payloads', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern1 = { group: '123', userId: 'ABC' }
  var pattern2 = { group: '123', userId: 'DEF' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.deepEqual(instance.list(), [payloadOne, payloadTwo])
})

test('listing all patterns', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern1 = { group: '123', userId: 'ABC' }
  var pattern2 = { group: '123', userId: 'DEF' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.deepEqual(instance.list(null, { patterns: true }), [pattern1, pattern2])
})

test('matching numbers', function (t) {
  t.plan(2)

  var instance = bloomrun()
  var pattern = {
    something: 'else',
    answer: 42
  }

  instance.add(pattern)

  t.deepEqual(instance.lookup(pattern), pattern)
  t.deepEqual(instance.list(pattern), [pattern])
})

test('order support', function (t) {
  t.plan(1)

  var instance = bloomrun()
  var pattern1 = { group: '123' }
  var pattern2 = { group: '123', another: 'value' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.equal(instance.lookup({ group: '123', another: 'value' }), payloadOne)
})

test('depth support', function (t) {
  t.plan(1)

  var instance = bloomrun({ indexing: 'depth' })
  var pattern1 = { group: '123' }
  var pattern2 = { group: '123', another: 'value' }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.equal(instance.lookup({ group: '123', another: 'value' }), payloadTwo)
})

test('recursive depth support', function (t) {
  t.plan(1)

  var instance = bloomrun({ indexing: 'depth' })
  var pattern1 = { group: '123', some: { key: 'value' } }
  var pattern2 = {
    group: '123',
    some: {
      key: 'value',
      a: 'b'
    }
  }

  function payloadOne () { }
  function payloadTwo () { }

  instance.add(pattern1, payloadOne)
  instance.add(pattern2, payloadTwo)

  t.equal(instance.lookup({
    group: '123',
    some: {
      key: 'value',
      a: 'b',
      c: 'd'
    }
  }), payloadTwo)
})
