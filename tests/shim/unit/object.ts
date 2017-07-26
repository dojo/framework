import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as object from '../../src/object';
import { assign } from '../../src/object';
import 'src/Symbol';

registerSuite({
	name: 'object',

	'.assign()': {
		'.assign()'() {
			const source: {
				a: number
				b: {
					enumerable: boolean,
					configurable: boolean,
					writable: boolean,
					value: number
				}
			} = Object.create({ a: 1 }, {
				b: {
					enumerable: false,
					configurable: true,
					writable: true,
					value: 2
				}
			});
			(<any> source).c = 3;
			(<any> source).nested = { a: 5 };

			const object: {
				c: number,
				nested: {
					a: number
				}
			} = Object.create(null);
			const assignedObject = assign(object, source);

			assert.strictEqual(object, assignedObject, 'assign should return the modified target object');
			assert.isUndefined(assignedObject.a, 'assign should not copy inherited properties');
			assert.isUndefined(assignedObject.b, 'assign should not copy non-enumerable properties');
			assert.strictEqual(assignedObject.c, 3);
			assert.strictEqual(assignedObject.nested, (<any> source).nested, 'assign should perform a shallow copy');
			assert.strictEqual(assignedObject.nested.a, 5);
		},

		'.assign() with multiple sources'() {
			let source1 = {
				property3: 'value3',
				property4: 'value4'
			};

			let source3 = {
				property7: 'value7',
				property8: 'value8'
			};

			const object = {
				property1: 'value1',
				property2: 'value2'
			};

			assign(object, source1, null, source3);

			assert.deepEqual(object, {
				property1: 'value1',
				property2: 'value2',
				property3: 'value3',
				property4: 'value4',
				property7: 'value7',
				property8: 'value8'
			});
		},

		'.assign() with inferred type from multiple sources'() {
			let source1: { a: number, b: number } | { c: number, d: number } = {
				a: 1,
				b: 2,
				c: 3,
				d: 4
			};

			let source2 = {
				a: 3,
				b: 2
			};

			let source3 = {
				c: 3,
				d: 4
			};

			const object = {};

			const assignedObject = assign(object, source1, source2, source3);

			assert(assignedObject);

			// Verify that the inferred type is what we expect
			const alsoAssigned: {} & ({ a: number, b: number } | { c: number, d: number }) = assign(object, source1, source2, source3);

			assert(alsoAssigned);
		},

		'.assign() with different types of sources'() {
			const baseObject = {
				foo: 'foo'
			};

			const assignedObject = assign({}, baseObject, { bar: 'bar' });
			assert.strictEqual(assignedObject.bar, 'bar');
			assert.strictEqual(assignedObject.foo, 'foo');
		},
		'.assign() with a source whose type is a subset of another'() {
			type FooBar = {
				foo: string;
				bar: string;
			};
			const foobar = {
				foo: 'foo',
				bar: 'bar'
			};
			const bar = {
				bar: 'baz'
			};
			const assignedObject = assign({}, foobar, bar);
			assert.strictEqual(assignedObject.foo, 'foo');
			assert.strictEqual(assignedObject.bar, 'baz');
		}
	},

	'.is()': {
		'two identical strings'() {
			assert.isTrue(object.is('foo', 'foo'));
		},

		'two different strings'() {
			assert.isFalse(object.is('foo', 'bar'));
		},

		'two NaNs'() {
			assert.isTrue(object.is(NaN, NaN));
		},

		'the same object'() {
			let obj = {};
			assert.isTrue(object.is(obj, obj));
		},

		'two nulls'() {
			assert.isTrue(object.is(null, null));
		},

		'two undefineds'() {
			assert.isTrue(object.is(undefined, undefined));
		},

		'null and undefined'() {
			assert.isFalse(object.is(null, undefined));
		},

		'two arrays'() {
			assert.isFalse(object.is([], []));
		},

		'zero and negative zero'() {
			assert.isFalse(object.is(0, -0));
		},

		'two positive zeros'() {
			assert.isTrue(object.is(0, 0));
		},

		'two negative zeros'() {
			assert.isTrue(object.is(-0, -0));
		},

		'two of the same boolean'() {
			assert.isTrue(object.is(true, true));
		},

		'two different booleans'() {
			assert.isFalse(object.is(true, false));
		},

		'two different Date objects with the same value'() {
			let date = new Date();
			assert.isFalse(object.is(date, new Date(Number(date))));
		}
	},

	'.getOwnPropertySymbols()': {
		'well-known'() {
			const o = {
				[Symbol.iterator]() {
					return 'foo';
				},
				bar() {
					return 'foo';
				}
			};
			const [ sym, ...other ] = object.getOwnPropertySymbols(o);
			assert.strictEqual(sym, Symbol.iterator);
			assert.strictEqual(other.length, 0);
		},
		'Symbol.for'() {
			const foo = Symbol.for('foo');
			const o = {
				[foo]: 'bar',
				bar: 1
			};
			const [ sym, ...other ] = object.getOwnPropertySymbols(o);
			assert.strictEqual(sym, foo);
			assert.strictEqual(other.length, 0);
		}
	},

	'.getOwnPropertyNames()'() {
		const sym = Symbol('foo');
		const o = {
			[Symbol.iterator]() {
				return 'foo';
			},
			[sym]: 'bar',
			bar: 1
		};
		assert.deepEqual(object.getOwnPropertyNames(o), [ 'bar' ]);
	},

	'.getOwnPropertyDescriptors()'() {
		const visibleSymbol = Symbol.for('foo');
		const hiddenSymbol = Symbol.for('hidden');

		const obj = {
			prop1: 'value1',
			get prop2() {
				return 'value2';
			},
			set prop3(_: string) {
			},
			[visibleSymbol]: 'foo'
		};

		Object.defineProperty(obj, 'hidden', {
			value: 'hidden',
			enumerable: false
		});

		(<any> Object).defineProperty(obj, hiddenSymbol, {
			value: 'test',
			enumerable: false
		});

		let keys = object.getOwnPropertyDescriptors(obj);

		assert.sameMembers(Object.keys(keys), [
			'prop1',
			'prop2',
			'prop3',
			'hidden'
		]);

		assert.sameMembers(object.getOwnPropertySymbols(obj), [
			visibleSymbol,
			hiddenSymbol
		]);
	},

	'.keys()'() {
		const sym = Symbol('foo');
		const o = {
			[Symbol.iterator]() {
				return 'foo';
			},
			[sym]: 'bar',
			bar: 1
		};

		Object.defineProperty(o, 'baz', {
			value: 'qat',
			enumerable: false
		});

		assert.strictEqual((<any> o).baz, 'qat');
		assert.strictEqual((<any> o)[sym], 'bar');
		assert.deepEqual(object.keys(o), [ 'bar' ]);
	},

	'.values()'() {
		const sym = Symbol('foo');
		const o = {
			key1: 'value1',
			key2: 2,
			[sym]: 5
		};

		assert.sameMembers(object.values(o), [ 'value1', 2 ]);
	},

	'.entries()'() {
		const sym = Symbol('foo');
		const o = {
			key1: 'value1',
			key2: 2,
			[sym]: 5
		};

		assert.sameDeepMembers(object.entries(o), [ [ 'key1', 'value1' ], [ 'key2', 2 ] ]);
	}
});
