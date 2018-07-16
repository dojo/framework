const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Set from '../../../src/shim/Set';
import List from '../../../src/core/List';

registerSuite('List', function() {
	function listWith<T>(...items: T[]): List<T> {
		const list = new List<T>();

		for (let i = 0; i < items.length; i++) {
			list.add(items[i]);
		}

		return list;
	}

	return {
		add() {
			const list = new List<number>();

			list.add(1);
			assert.equal(list.size, 1);

			list.add(2);
			assert.equal(list.size, 2);
		},

		clear() {
			const list = new List<number>();

			list.add(1);
			list.clear();
			assert.equal(list.size, 0);
		},

		delete() {
			const list = listWith(1, 2, 3);

			assert.strictEqual(list.delete(1), true);

			assert.equal(list.size, 2);
			assert.equal(list.indexOf(2), -1, 'Did not expect 2 to be in the list');

			assert.strictEqual(list.delete(2), false);
		},
		entries() {
			const list = listWith('one', 'two', 'three');

			let entries: [number, string][] = [];

			for (const value of list.entries()) {
				entries.push(value);
			}

			assert.deepEqual(entries, [[0, 'one'], [1, 'two'], [2, 'three']]);
		},

		forEach() {
			const list = listWith('one', 'two', 'three');

			let items: string[] = [];
			let indicies: number[] = [];
			let obj = {
				myValue: 'test'
			};

			list.forEach(function(this: any, value: string, index: number) {
				assert(this.myValue, 'test');

				items.push(value);
				indicies.push(index);
			}, obj);

			assert.deepEqual(items, ['one', 'two', 'three']);
			assert.deepEqual(indicies, [0, 1, 2]);

			list.forEach(function(this: any) {
				assert.equal(this, list);
			});
		},

		has() {
			const list = listWith('one', 'two', 'three');

			assert.isFalse(list.has(3));
			assert.isTrue(list.has(2));
			assert.isTrue(list.has(0));
		},

		keys() {
			const list = listWith('one', 'two', 'three');

			let keys: number[] = [];

			for (const key of list.keys()) {
				keys.push(key);
			}

			assert.deepEqual(keys, [0, 1, 2]);
		},

		values() {
			const list = listWith('one', 'two', 'three');

			let values: string[] = [];

			for (const value of list.values()) {
				values.push(value);
			}

			assert.deepEqual(values, ['one', 'two', 'three']);
		},

		includes() {
			const list = listWith('one', 'two', 'three');

			assert.isTrue(list.includes('two'));
			assert.isFalse(list.includes('four'));
			assert.isTrue(list.includes('one'));
		},

		indexOf() {
			const list = listWith('one', 'two', 'three', 'two');

			assert.equal(list.indexOf('two'), 1);
			assert.equal(list.indexOf('test'), -1);
		},

		lastIndexOf() {
			const list = listWith('one', 'two', 'three', 'two');

			assert.equal(list.lastIndexOf('two'), 3);
			assert.equal(list.lastIndexOf('test'), -1);
		},

		push() {
			const list = new List();

			list.push('one');

			assert.equal(list.size, 1);
			assert.equal(list.indexOf('one'), 0);
		},

		pop() {
			const list = listWith(1, 2, 3);

			assert.equal(list.pop(), 3);
			assert.equal(list.size, 2);
			assert.equal(list.indexOf(3), -1);
			assert.equal(list.indexOf(2), 1);
		},

		splice() {
			const list = listWith(1, 2, 3);

			assert.deepEqual(list.splice(0, 1), [1]);
			assert.deepEqual(list.splice(1, 0, 1), []);

			assert.equal(list.indexOf(1), 1);
			assert.equal(list.indexOf(2), 0);
			assert.equal(list.indexOf(3), 2);

			assert.deepEqual(list.splice(1), [1, 3]);
			assert.equal(list.size, 1);
			assert.equal(list.indexOf(2), 0);
		},

		join() {
			let list = listWith('the', 'quick', 'brown', 'fox');

			assert.equal(list.join(), 'the,quick,brown,fox');
			assert.equal(list.join(' '), 'the quick brown fox');

			list = new List<string>();

			assert.equal(list.join(), '');

			list.push('one');

			assert.equal(list.join(), 'one');
		},

		'@@iterator'() {
			const list = listWith('the', 'quick', 'brown', 'fox');
			let values: string[] = [];

			for (const value of list) {
				values.push(value);
			}

			assert.deepEqual(values, ['the', 'quick', 'brown', 'fox']);
		},

		constructor() {
			// empty list
			let list = new List();
			assert.equal(list.size, 0);

			// array like
			list = new List([1, 2, 3]);
			assert.equal(list.size, 3);
			assert.strictEqual(list.indexOf(1), 0);
			assert.strictEqual(list.indexOf(2), 1);
			assert.strictEqual(list.indexOf(3), 2);

			// iterable
			const set = new Set<number>();
			set.add(1);
			set.add(2);
			set.add(3);

			list = new List(set);
			assert.equal(list.size, 3);
			assert.strictEqual(list.indexOf(1), 0);
			assert.strictEqual(list.indexOf(2), 1);
			assert.strictEqual(list.indexOf(3), 2);
		}
	};
});
