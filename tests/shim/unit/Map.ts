import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Map from 'src/Map';

let map: Map<any, any>;
let mapArgs: any[];

registerSuite({
	name: 'Map',

	instantiation: {
		'null data'() {
			assert.doesNotThrow(function () {
				map = new Map<number, string>(null);
			});
		},

		'undefined data'() {
			assert.doesNotThrow(function () {
				map = new Map<number, string>(undefined);
			});
		},

		'empty data'() {
			assert.doesNotThrow(function () {
				map = new Map<number, string>([]);
			});
		},

		'array like data'() {
			assert.doesNotThrow(function () {
				map = new Map<number, string>({
					length: 1,
					0: [ 3, 'bar' ]
				});
			});
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
			map = new Map<number, string>([[ 3, 'abc' ]]);
			map.set(3, 'def');
			assert.strictEqual(map.get(3), 'def');
		},

		'size updates'() {
			map = new Map<string, string>();
			assert.strictEqual(map.size, 0);
			map.set('foo', 'bar');
			assert.strictEqual(map.size, 1);
		}
	},

	get: {
		before() {
			map = new Map<number, string>([
				[0, 'a'],
				[8, 'b']
			]);
		},

		'key found'() {
			assert.strictEqual(map.get(0), 'a');
			assert.strictEqual(map.get(8), 'b');
		},

		'key not found'() {
			assert.isUndefined(map.get(3));
		}
	},

	'delete': {
		before() {
			map = new Map<number, string>([
				[ 3, 'abc' ]
			]);
		},

		'key found'() {
			assert.isTrue(map.delete(3));
			assert.isUndefined(map.get(3));
		},

		'key not found'() {
			assert.isFalse(map.delete('foo'));
		}
	},

	has: {
		before() {
			map = new Map<number, string>([
				[ 3, 'abc' ]
			]);
		},

		'key found'() {
			assert.isTrue(map.has(3));
		},

		'key not found'() {
			assert.isFalse(map.has(0));
		}
	},

	clear: {
		'empty map'() {
			map = new Map<void, void>();
			assert.doesNotThrow(function () {
				map.clear();
			});
		},

		'nonempty map'() {
			map = new Map<number, string>([
				[ 3, 'abc' ]
			]);
			map.clear();
			assert.isFalse(map.has(3));
			assert.strictEqual(map.size, 0);
		}
	},

	keys: {
		'empty map'() {
			map = new Map<void, void>();
			assert.deepEqual(map.keys(), []);
		},

		'nonempty map'(){
			function foo() { }
			let object = Object.create(null);
			let array = new Array();
			map = new Map<any, any>([
				[0, 0],
				['1', 1],
				[object, 2],
				[array, 3],
				[foo, 4]
			]);
			assert.deepEqual(map.keys(), [
				0, '1', object, array, foo
			]);
		},
	},

	values() {
		function foo() {}
		let object = Object.create(null);
		let array = new Array();
		map = new Map<number, any>([
			[ 0, 0 ],
			[ 1, '1' ],
			[ 2, object ],
			[ 3, array ],
			[ 4, foo ],
			[ 5, undefined ]
		]);
		assert.deepEqual(map.values(), [
			0, '1', object, array, foo, undefined
		]);
	},

	entries: {
		'empty map'() {
			map = new Map<void, void>();
			assert.deepEqual(map.entries(), []);
		},

		'nonempty map'() {
			map = new Map<number, string>([
				[ 1, 'a' ],
				[ 2, 'b' ],
				[ 3, 'c' ]
			]);
			assert.deepEqual(map.entries(), [
				[ 1, 'a' ],
				[ 2, 'b' ],
				[ 3, 'c' ]
			]);
		}
	},

	iteration: {
		before() {
			function foo() {}
			let object = Object.create(null);
			let array = new Array();
			mapArgs = [
				[0, 0],
				[1, '1'],
				[2, object],
				[3, array],
				[4, foo],
				[5, undefined]
			]
			map = new Map<number, any>(mapArgs);
		},

		'callback arguments'() {
			map.forEach(function (key, value, mapInstance) {
				assert.lengthOf(arguments, 3);
				assert.strictEqual(map.get(key), value);
				assert.strictEqual(map, mapInstance);
			})
		},

		'times executed'() {
			let counter = 0;
			map.forEach(function (key, value, mapInstance) {
				counter++;
			});
			assert.strictEqual(counter, mapArgs.length);
		}
	}
});
