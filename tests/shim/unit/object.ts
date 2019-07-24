import Object, * as object from '../../../src/shim/object';
import global from '../../../src/shim/global';
import '../../../src/shim/Symbol';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('object', {
	polyfill() {
		assert.equal(Object, global.Object);
	},
	'.assign()': {
		'.assign()'() {
			for (let assign of [Object.assign, object.assign]) {
				const source: {
					a: number;
					b: {
						enumerable: boolean;
						configurable: boolean;
						writable: boolean;
						value: number;
					};
				} = Object.create(
					{ a: 1 },
					{
						b: {
							enumerable: false,
							configurable: true,
							writable: true,
							value: 2
						}
					}
				);
				(<any>source).c = 3;
				(<any>source).nested = { a: 5 };

				const object: {
					c: number;
					nested: {
						a: number;
					};
				} = Object.create(null);
				const assignedObject = assign(object, source);

				assert.strictEqual(object, assignedObject, 'assign should return the modified target object');
				assert.isUndefined(assignedObject.a, 'assign should not copy inherited properties');
				assert.isUndefined(assignedObject.b, 'assign should not copy non-enumerable properties');
				assert.strictEqual(assignedObject.c, 3);
				assert.strictEqual(assignedObject.nested, (<any>source).nested, 'assign should perform a shallow copy');
				assert.strictEqual(assignedObject.nested.a, 5);
			}
		},

		'.assign() with multiple sources'() {
			for (let assign of [Object.assign, object.assign]) {
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
				} as any);
			}
		},

		'.assign() with inferred type from multiple sources'() {
			for (let assign of [Object.assign, object.assign]) {
				let source1: { a: number; b: number } | { c: number; d: number } = {
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
				const alsoAssigned: {} & ({ a: number; b: number } | { c: number; d: number }) = assign(
					object,
					source1,
					source2,
					source3
				);

				assert(alsoAssigned);
			}
		},

		'.assign() with different types of sources'() {
			for (let assign of [Object.assign, object.assign]) {
				const baseObject = {
					foo: 'foo'
				};

				const assignedObject = assign({}, baseObject, { bar: 'bar' });
				assert.strictEqual(assignedObject.bar, 'bar');
				assert.strictEqual(assignedObject.foo, 'foo');
			}
		},
		'.assign() with a source whose type is a subset of another'() {
			for (let assign of [Object.assign, object.assign]) {
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
		}
	},

	'.is()': {
		'two identical strings'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is('foo', 'foo'));
			}
		},

		'two different strings'() {
			for (let is of [Object.is, object.is]) {
				assert.isFalse(is('foo', 'bar'));
			}
		},

		'two NaNs'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(NaN, NaN));
			}
		},

		'the same object'() {
			for (let is of [Object.is, object.is]) {
				let obj = {};
				assert.isTrue(is(obj, obj));
			}
		},

		'two nulls'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(null, null));
			}
		},

		'two undefineds'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(undefined, undefined));
			}
		},

		'null and undefined'() {
			for (let is of [Object.is, object.is]) {
				assert.isFalse(is(null, undefined));
			}
		},

		'two arrays'() {
			for (let is of [Object.is, object.is]) {
				assert.isFalse(is([], []));
			}
		},

		'zero and negative zero'() {
			for (let is of [Object.is, object.is]) {
				assert.isFalse(is(0, -0));
			}
		},

		'two positive zeros'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(0, 0));
			}
		},

		'two negative zeros'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(-0, -0));
			}
		},

		'two of the same boolean'() {
			for (let is of [Object.is, object.is]) {
				assert.isTrue(is(true, true));
			}
		},

		'two different booleans'() {
			for (let is of [Object.is, object.is]) {
				assert.isFalse(is(true, false));
			}
		},

		'two different Date objects with the same value'() {
			for (let is of [Object.is, object.is]) {
				let date = new Date();
				assert.isFalse(is(date, new Date(Number(date))));
			}
		}
	},

	'.getOwnPropertySymbols()': {
		'well-known'() {
			for (let getOwnPropertySymbols of [Object.getOwnPropertySymbols, object.getOwnPropertySymbols]) {
				const o = {
					[Symbol.iterator]() {
						return 'foo';
					},
					bar() {
						return 'foo';
					}
				};
				const [sym, ...other] = getOwnPropertySymbols(o);
				assert.strictEqual(sym, Symbol.iterator);
				assert.strictEqual(other.length, 0);
			}
		},
		'Symbol.for'() {
			for (let getOwnPropertySymbols of [Object.getOwnPropertySymbols, object.getOwnPropertySymbols]) {
				const foo = Symbol.for('foo');
				const o = {
					[foo]: 'bar',
					bar: 1
				};
				const [sym, ...other] = getOwnPropertySymbols(o);
				assert.strictEqual(sym, foo);
				assert.strictEqual(other.length, 0);
			}
		}
	},

	'.getOwnPropertyNames()'() {
		for (let getOwnPropertyNames of [Object.getOwnPropertyNames, object.getOwnPropertyNames]) {
			const sym = Symbol('foo');
			const o = {
				[Symbol.iterator]() {
					return 'foo';
				},
				[sym]: 'bar',
				bar: 1
			};
			assert.deepEqual(getOwnPropertyNames(o), ['bar']);
		}
	},

	'.getOwnPropertyDescriptors()'() {
		for (let { getOwnPropertyDescriptors, getOwnPropertySymbols } of [
			{
				getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
				getOwnPropertySymbols: Object.getOwnPropertySymbols
			},
			{
				getOwnPropertyDescriptors: object.getOwnPropertyDescriptors,
				getOwnPropertySymbols: object.getOwnPropertySymbols
			}
		]) {
			const visibleSymbol = Symbol.for('foo');
			const hiddenSymbol = Symbol.for('hidden');

			const obj = {
				prop1: 'value1',
				get prop2() {
					return 'value2';
				},
				set prop3(_: string) {},
				[visibleSymbol]: 'foo'
			};

			Object.defineProperty(obj, 'hidden', {
				value: 'hidden',
				enumerable: false
			});

			(<any>Object).defineProperty(obj, hiddenSymbol, {
				value: 'test',
				enumerable: false
			});

			let keys = getOwnPropertyDescriptors(obj);

			assert.sameMembers(Object.keys(keys), ['prop1', 'prop2', 'prop3', 'hidden']);

			assert.sameMembers(getOwnPropertySymbols(obj), [visibleSymbol, hiddenSymbol]);
		}
	},

	'.keys()'() {
		for (let keys of [Object.keys, object.keys]) {
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

			assert.strictEqual((<any>o).baz, 'qat');
			assert.strictEqual((<any>o)[sym], 'bar');
			assert.deepEqual(keys(o), ['bar']);
		}
	},

	'.values()'() {
		for (let values of [Object.values, object.values]) {
			const sym = Symbol('foo');
			const o = {
				key1: 'value1',
				key2: 2,
				[sym]: 5
			};

			assert.sameMembers(values(o), ['value1', 2]);
		}
	},

	'.entries()'() {
		for (let entries of [Object.entries, object.entries]) {
			const sym = Symbol('foo');
			const o = {
				key1: 'value1',
				key2: 2,
				[sym]: 5
			};

			assert.sameDeepMembers(entries(o), [['key1', 'value1'], ['key2', 2]]);
		}
	}
});
