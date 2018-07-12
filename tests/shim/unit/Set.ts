import Set from '../../src/Set';
import { ShimIterator } from '../../src/iterator';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('Set', {
	construction: {
		'no arguments'() {
			const set = new Set();
			assert(set, 'set should exist');
			assert.instanceOf(set, Set, 'set should be instance of Set');
		},

		iterable() {
			const set = new Set([1, 2, 3, 2]);
			assert.isTrue(set.has(1));
			assert.isTrue(set.has(2));
			assert.isTrue(set.has(3));
			assert.isFalse(set.has(4));
			assert.strictEqual(set.size, 3);
		},

		arraylike() {
			const set = new Set(
				new ShimIterator({
					0: 1,
					1: 2,
					2: 3,
					3: 2,
					length: 4
				})
			);
			assert.isTrue(set.has(1));
			assert.isTrue(set.has(2));
			assert.isTrue(set.has(3));
			assert.isFalse(set.has(4));
			assert.strictEqual(set.size, 3);
		}
	},

	'.delete'() {
		const set = new Set([1]);
		assert.isTrue(set.has(1), 'Should have member');
		assert.isFalse(set.delete(2), 'Should return false for missing memeber');
		assert.isTrue(set.delete(1), 'Should return true when member removed');
		assert.isFalse(set.delete(1), 'Should return false for already removed member');
		assert.isFalse(set.has(1), 'Should now return false');
	},

	iterable() {
		const source = [1, 2, 3];
		const set = new Set(source);
		const results: number[] = [];
		for (const value of set) {
			results.push(value);
		}
		assert.deepEqual(results, source, 'results should match source');
	},

	'.values()'() {
		const source = [1, 2, 3];
		const set = new Set(source);
		const results: number[] = [];
		for (const value of set.values()) {
			results.push(value);
		}
		assert.deepEqual(results, source, 'results should match source');
	},

	'.keys()'() {
		const source = [1, 2, 3];
		const set = new Set(source);
		const results: number[] = [];
		for (const value of set.keys()) {
			results.push(value);
		}
		assert.deepEqual(results, source, 'results should match source');
	},

	'.entries()'() {
		const set = new Set([1, 2, 3]);
		const results: [number, number][] = [];
		for (const value of set.entries()) {
			results.push(value);
		}
		assert.deepEqual(results, [[1, 1], [2, 2], [3, 3]], 'results should match expected');
	},

	'.has()'() {
		const set = new Set([1, '2']);
		assert.isTrue(set.has(1));
		assert.isFalse(set.has('1'));
		assert.isTrue(set.has('2'));
		assert.isFalse(set.has(2));
	},

	'.add()'() {
		const set = new Set();
		set
			.add(1)
			.add('foo')
			.add(/ /)
			.add({})
			.add([1])
			.add(1)
			.add('foo');
		assert.strictEqual(set.size, 5, 'should have the right size');
		assert.isTrue(set.has(1));
		assert.isTrue(set.has('foo'));
	},

	'.clear()'() {
		const set = new Set([1, 2, 3]);
		set.add(4);
		assert.strictEqual(set.size, 4);
		assert.isTrue(set.has(1));
		assert.isTrue(set.has(4));
		set.clear();
		assert.strictEqual(set.size, 0);
		assert.isFalse(set.has(1));
		assert.isFalse(set.has(4));
		set
			.add(1)
			.add(2)
			.add(3)
			.add(4);
		assert.strictEqual(set.size, 4);
		assert.isTrue(set.has(1));
		assert.isTrue(set.has(4));
		set.clear();
		assert.strictEqual(set.size, 0);
		assert.isFalse(set.has(1));
		assert.isFalse(set.has(4));
	},

	'.forEach()'() {
		const source = [1, 2, 3, { foo: 'bar' }];
		const scope = {};
		const set = new Set(source);
		const results: any[] = [];
		set.forEach(function(this: any, value: any, index: any, subject: any) {
			assert.strictEqual(set, subject);
			assert.strictEqual(this, scope);
			assert.strictEqual(value, index);
			results.push(value);
		}, scope);
		assert.deepEqual(results, source);
	}
});
