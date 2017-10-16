const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import MultiMap from '../../src/MultiMap';
import { forOf, isIterable, IterableIterator, ShimIterator } from '@dojo/shim/iterator';

let map: MultiMap<any>;
function foo() {}
const object = Object.create(null);
const array: any[] = [];
const mapArgs: any[] = [
	[ [ 0 ], 0 ],
	[ [ 0, 1, 2 ], '1' ],
	[ [ 2, 3, 4, 5, 6 ], object ],
	[ [ 3 ], array ],
	[ [ 4, 3, 2, 1 ], foo ],
	[ [ 5 ], undefined ]
];

registerSuite('Map', {
	instantiation: {
		'null data'() {
			assert.doesNotThrow(function () {
				map = new MultiMap<string>(<any> null);
			});
		},

		'undefined data'() {
			assert.doesNotThrow(function () {
				map = new MultiMap<string>(undefined);
			});
		},

		'empty data'() {
			assert.doesNotThrow(function () {
				map = new MultiMap<string>([]);
			});
		},

		'iterator data'() {
			assert.doesNotThrow(function () {
				map = new MultiMap(new ShimIterator<[any[], any]>({
					length: 1,
					0: [ [ 1 ], 'foo' ]
				}));
			});
		}
	},

	clear: {
		'empty map'() {
			map = new MultiMap();
			assert.doesNotThrow(function () {
				map.clear();
			});
		},

		'non-empty map'() {
			map = new MultiMap([
				[ [ 1 ] , 'foo' ]
			]);
			assert.isFalse(map.has([3]));
			map.clear();
			assert.isFalse(map.has([3]));
		}
	},

	'delete': {
		before() {
			map = new MultiMap([
				[ [ 1 ], 'foo' ],
				[ [ 1, 2 ], 'bar' ],
				[ [ 2 ], 'baz' ]
			]);
		},

		tests: {
			'key found'() {
				assert.strictEqual(map.get([ 1, 2 ]), 'bar');
				assert.isTrue(map.delete([ 1, 2 ]));
				assert.isUndefined(map.get([ 1, 2 ]));
				assert.strictEqual(map.get([ 1 ] ), 'foo');
				assert.strictEqual(map.get([ 2 ] ), 'baz');
			},

			'key not found'() {
				assert.isFalse(map.delete([ 'foo' ]));
			}
		}
	},

	size() {
		map = new MultiMap<any>(mapArgs);
		assert.strictEqual(map.size, 6);
		map.delete([ 2, 3, 4, 5, 6 ]);
		assert.strictEqual(map.size, 5);
		map.clear();
		assert.strictEqual(map.size, 0);
	},

	entries() {
		map = new MultiMap<any>(mapArgs);
		const entries: IterableIterator<[any[], any]> = map.entries();

		assert.isTrue(isIterable(entries), 'Returns an iterable.');

		let i = 0;
		forOf(entries, function (value: [ any[], any ]): void {
			value[0].forEach((key, index) => {
				assert.strictEqual(key, mapArgs[i][0][index]);
			});
			assert.strictEqual(value[1], mapArgs[i][1]);
			i++;
		});
	},

	'Symbol iterator'() {
		map = new MultiMap<any>(mapArgs);
		const entries = map[Symbol.iterator]();

		assert.isTrue(isIterable(entries), 'Returns an iterable.');

		let i = 0;
		forOf(entries, function (value: [ any[], any ]): void {
			value[0].forEach((key, index) => {
				assert.strictEqual(key, mapArgs[i][0][index]);
			});
			assert.strictEqual(value[1], mapArgs[i][1]);
			i++;
		});
	},

	forEach: {
		before() {
			map = new MultiMap<any>(mapArgs);
		},

		tests: {
			'callback arguments'() {
				map.forEach(function (value, key, mapInstance) {
					assert.lengthOf(arguments, 3);
					assert.strictEqual(map.get(key), value);
					assert.strictEqual(map, mapInstance);
				});
			},

			'times executed'() {
				let counter = 0;
				map.forEach(function (key, value, mapInstance) {
					counter++;
				});
				assert.strictEqual(counter, mapArgs.length);
			}
		}
	},

	get: {
		before() {
			map = new MultiMap(mapArgs);
		},

		tests: {
			'key found'() {
				assert.strictEqual(map.get([ 0 ]), 0);
				assert.strictEqual(map.get([ 4, 3, 2, 1 ]), foo);
			},

			'key not found'() {
				assert.isUndefined(map.get([ 2, 3, 4, 5, 7 ]));
			}
		}
	},

	has: {
		before() {
			map = new MultiMap(mapArgs);
		},

		tests: {
			'key found'() {
				assert.isTrue(map.has([ 4, 3, 2, 1 ]));
			},

			'key not found'() {
				assert.isFalse(map.has([ 'key', 'not', 'exist' ]));
			}
		}
	},

	keys() {
		map = new MultiMap<any>(mapArgs);
		const keys: IterableIterator<any[]> = map.keys();

		assert.isTrue(isIterable(keys), 'Returns an iterable.');

		let i = 0;
		forOf(keys, function (value: any[]): void {
			value.forEach((key, index) => {
				assert.strictEqual(key, mapArgs[i][0][index]);
			});
			i++;
		});
	},

	set: {
		beforeEach() {
			map = new MultiMap<any>();
		},

		tests: {
			'single key'() {
				map = new MultiMap<any>();
				map.set( [ 1 ], 'foo');
				assert.strictEqual(map.get([ 1 ]), 'foo');
			},

			'multiple keys'() {
				map = new MultiMap<string>();
				map.set([ 'foo', 'bar', 'baz', foo, object, array ], 'qux');
				assert.strictEqual(map.get([ 'foo', 'bar', 'baz', foo, object, array ]), 'qux');
			},

			'returns instance'() {
				map = new MultiMap<string>();
				assert.instanceOf(map.set([ 'foo' ], 'bar'), MultiMap);
				assert.strictEqual(map.set([ 'foo' ], 'bar'), map);
			},

			'key exists'() {
				map = new MultiMap<string>([ [ [ 3 ], 'abc' ] ]);
				map.set([ 3 ], 'def');
				assert.strictEqual(map.get([ 3 ]), 'def');
			}
		}
	},

	values() {
		map = new MultiMap<any>(mapArgs);
		const values: IterableIterator<any> = map.values();

		assert.isTrue(isIterable(values), 'Returns an iterable.');

		let i = 0;
		forOf(values, function (value: any): void {
			assert.strictEqual(value, mapArgs[i][1]);
			i++;
		});
	}
});
