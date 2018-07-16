import { isIterable, IterableIterator, ShimIterator } from '../../../src/shim/iterator';
import Map from '../../../src/shim/Map';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let map: Map<any, any>;
let mapArgs: any[];

registerSuite('shim/Map', {
	instantiation: {
		'null data'() {
			assert.doesNotThrow(function() {
				map = new Map<number, string>(<any>null);
			});
		},

		'undefined data'() {
			assert.doesNotThrow(function() {
				map = new Map<number, string>(undefined);
			});
		},

		'empty data'() {
			assert.doesNotThrow(function() {
				map = new Map<number, string>([]);
			});
		},

		'iterator data'() {
			assert.doesNotThrow(function() {
				map = new Map(
					new ShimIterator<[number, string]>({
						length: 1,
						0: [3, 'bar']
					})
				);
			});
		}
	},

	clear: {
		'empty map'() {
			map = new Map();
			assert.doesNotThrow(function() {
				map.clear();
			});
		},

		'non-empty map'() {
			map = new Map([[3, 'abc']]);
			map.clear();
			assert.isFalse(map.has(3));
			assert.strictEqual(map.size, 0);
		}
	},

	delete: {
		before() {
			map = new Map([[3, 'abc'], [4, 'def']]);
		},

		tests: {
			'key found'() {
				assert.isTrue(map.delete(3));
				assert.isUndefined(map.get(3));
				assert.strictEqual(map.size, 1);
				assert.strictEqual(map.get(4), 'def', 'Remaining key should not be affected by delete');
			},

			'key not found'() {
				assert.isFalse(map.delete('foo'));
			}
		}
	},

	entries() {
		function foo() {}
		const array: any[] = [];
		const object = Object.create(null);
		mapArgs = [[0, 0], [1, '1'], [2, object], [3, array], [4, foo], [5, undefined]];
		map = new Map<number, any>(mapArgs);
		const entries: IterableIterator<[number, any]> = map.entries();

		assert.isTrue(isIterable(entries), 'Returns an iterable.');

		let i = 0;
		for (const value of entries) {
			assert.strictEqual(value[0], mapArgs[i][0]);
			assert.strictEqual(value[1], mapArgs[i][1]);
			i++;
		}
	},

	forEach: {
		before() {
			function foo() {}
			const object = Object.create(null);
			const array: any[] = [];
			mapArgs = [[0, 0], [1, '1'], [2, object], [3, array], [4, foo], [5, undefined]];
			map = new Map<number, any>(mapArgs);
		},

		tests: {
			'callback arguments'() {
				map.forEach(function(value, key, mapInstance) {
					assert.lengthOf(arguments, 3);
					assert.strictEqual(map.get(key), value);
					assert.strictEqual(map, mapInstance);
				});
			},

			'times executed'() {
				let counter = 0;
				map.forEach(function(key, value, mapInstance) {
					counter++;
				});
				assert.strictEqual(counter, mapArgs.length);
			}
		}
	},

	get: {
		before() {
			map = new Map([[0, 'a'], [8, 'b'], [NaN, 'c']]);
		},

		tests: {
			'key found'() {
				assert.strictEqual(map.get(0), 'a');
				assert.strictEqual(map.get(8), 'b');
				assert.strictEqual(map.get(NaN), 'c', 'Map should successfully retrieve an item with a key of NaN');
			},

			'key not found'() {
				assert.isUndefined(map.get(3));
			}
		}
	},

	has: {
		before() {
			map = new Map<number, string>([[3, 'abc']]);
		},

		tests: {
			'key found'() {
				assert.isTrue(map.has(3));
			},

			'key not found'() {
				assert.isFalse(map.has(0));
			}
		}
	},

	keys() {
		mapArgs = '012345'.split('').map(function(value: string) {
			const numeric = Number(value);
			return [numeric, numeric];
		});
		map = new Map<number, number>(mapArgs);
		const keys: IterableIterator<number> = map.keys();

		assert.isTrue(isIterable(keys), 'Returns an iterable.');

		let i = 0;
		for (const value of keys) {
			assert.strictEqual(value, mapArgs[i][0]);
			i++;
		}
	},

	set: {
		'number key'() {
			map = new Map<number, string>();
			map.set(1, 'abc');
			assert.strictEqual(map.get(1), 'abc');
		},

		'string key'() {
			map = new Map<string, string>();
			map.set('foo', 'bar');
			assert.strictEqual(map.get('foo'), 'bar');
		},

		'object key'() {
			map = new Map<{}, string>();
			let object = Object.create(null);
			map.set(object, 'abc');
			assert.strictEqual(map.get(object), 'abc');
		},

		'array key'() {
			map = new Map<any[], string>();
			let array: any[] = [];
			map.set(array, 'abc');
			assert.strictEqual(map.get(array), 'abc');
		},

		'function key'() {
			map = new Map<() => any, string>();
			function foo() {}
			map.set(foo, 'abc');
			assert.strictEqual(map.get(foo), 'abc');
		},

		'returns instance'() {
			map = new Map<string, string>();
			assert.instanceOf(map.set('foo', 'bar'), Map);
			assert.strictEqual(map.set('foo', 'bar'), map);
		},

		'key exists'() {
			map = new Map<number, string>([[3, 'abc']]);
			map.set(3, 'def');
			assert.strictEqual(map.get(3), 'def');
		},

		'size updates'() {
			map = new Map<string, string>();
			assert.strictEqual(map.size, 0);

			map.set('foo', 'bar');
			assert.strictEqual(map.size, 1, 'size should increase after setting a new key');

			map.set('foo', 'baz');
			assert.strictEqual(map.size, 1, 'size should remain the same after setting an existing key');
		}
	},

	values() {
		function foo() {}
		const array: any[] = [];
		const object = Object.create(null);
		mapArgs = [[0, 0], [1, '1'], [2, object], [3, array], [4, foo], [5, undefined]];
		map = new Map<number, any>(mapArgs);
		const values: IterableIterator<any> = map.values();

		assert.isTrue(isIterable(values), 'Returns an iterable.');

		let i = 0;
		for (const value of values) {
			assert.strictEqual(value, mapArgs[i][1]);
			i++;
		}
	}
});
