import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import WeakMap from 'src/WeakMap';
import { ShimIterator } from 'src/iterator';

interface Key {}

registerSuite({
	name: 'WeakMap',

	construction: {
		'no arguments'() {
			const map = new WeakMap();
			assert(map, 'map should exist');
			assert.instanceOf(map, WeakMap, 'map should be an instance of WeakMap');
		},

		'array'() {
			const key1: Key = {};
			const key2: Key = {};
			const map = new WeakMap([
				[ key1, 1 ],
				[ key2, 2 ]
			]);

			assert.isTrue(map.has(key1), 'key1 should be in map');
			assert.isTrue(map.has(key2), 'key2 should be in map');
			assert.strictEqual(map.get(key1), 1, 'key1 should equal 1');
			assert.strictEqual(map.get(key2), 2, 'key2 should equal 2');
		},

		'iterable'() {
			const key1: Key = {};
			const key2: Key = {};
			const map = new WeakMap(new ShimIterator<[Key, number]>({
				0: [ key1, 1 ],
				1: [ key2, 2 ],
				length: 2
			}));

			assert.isTrue(map.has(key1), 'key1 should be in map');
			assert.isTrue(map.has(key2), 'key2 should be in map');
			assert.strictEqual(map.get(key1), 1, 'key1 should equal 1');
			assert.strictEqual(map.get(key2), 2, 'key2 should equal 2');
		}
	},

	'.delete'() {
		const key: Key = {};
		const map = new WeakMap([
			[ key, 1 ]
		]);

		assert.isTrue(map.delete(key), 'deleting key should return true');
		assert.isFalse(map.has(key), 'key should not be in map');
		assert.isFalse(map.delete(key), 'deleting key again should return false');
	},

	'.get'() {
		const key1: Key = {};
		const key2: Key = Object.create(key1);
		const map = new WeakMap([
			[ key1, 1 ],
			[ key2, 2 ]
		]);

		assert.strictEqual(map.get(key1), 1, 'key1 should equal 1');
		assert.strictEqual(map.get(key2), 2, 'key2 should equal 2');

		map.delete(key1);

		assert.strictEqual(map.get(key1), undefined, 'key1 should be undefined');
		assert.strictEqual(map.get(key2), 2, 'key2 should be 2');

		map.delete(key2);

		assert.strictEqual(map.get(key1), undefined, 'key1 should still be undefined');
		assert.strictEqual(map.get(key2), undefined, 'key2 should be undefined');
	},

	'.has'() {
		const key1: Key = {};
		const key2: Key = Object.create(key1);
		const key3: Key = {};
		const map = new WeakMap([
			[ key1, 1 ],
			[ key3, 3 ]
		]);

		assert.isTrue(map.has(key1), 'key1 should be in map');
		assert.isFalse(map.has(key2), 'key2 should not be in map');
		assert.isTrue(map.has(key3), 'key3 should be in map');
	},

	'.set'() {
		const key1: Key = {};
		const key2: Key = Object.create(key1);
		const map = new WeakMap<Key, number>();

		assert.isFalse(map.has(key1), 'key1 should not be in map');
		assert.isFalse(map.has(key2), 'key2 should not be in map');

		assert.strictEqual(map.set(key1, 1), map, 'set() should return map');
		assert.strictEqual(map.get(key1), 1, 'key1 should equal 1');
		assert.isFalse(map.has(key2), 'key2 still should not be in map');
		assert.strictEqual(map.set(key2, 2), map, 'set() should still return map');
		assert.strictEqual(map.get(key1), 1, 'key1 should still equal 1');
		assert.strictEqual(map.get(key2), 2, 'key2 should equal 2');
		map.set(key2, 3);
		assert.strictEqual(map.get(key2), 3, 'key2 should equal 3');

		assert.throws(function () {
			map.set(1, 1);
		});
		assert.throws(function () {
			map.set(null, 1);
		});
		assert.throws(function () {
			map.set(undefined, 1);
		});
		assert.throws(function () {
			map.set(true, 1);
		});
		assert.throws(function () {
			map.set('', 1);
		});
		assert.doesNotThrow(function () {
			map.set(function () {}, 1);
		});
		assert.doesNotThrow(function () {
			map.set(/ /, 1);
		});
		assert.doesNotThrow(function () {
			map.set(new Date(), 1);
		});
		assert.doesNotThrow(function () {
			map.set([], 1);
		});
	}
});
