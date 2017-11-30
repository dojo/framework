const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as lang from '../../src/lang';

registerSuite('lang functions', {
	'.assign()'() {
		// this is a re-export from `@dojo/shim/object::assign`
		assert.isFunction(lang.assign);
	},

	'.deepAssign()'() {
		const source: {
			a: number,
			b: {
				enumerable: boolean,
				configurable: boolean,
				writable: boolean,
				value: number
			},
			c: {
				d: number,
				e: any[]
			}
		} = Object.create({ a: 1 }, {
			b: {
				enumerable: false,
				configurable: true,
				writable: true,
				value: 2
			}
		});

		source.c = {
			d: 3,
			e: [ 4, [ 5 ], { f: 6 } ]
		};

		const object: {} = Object.create(null);
		const assignedObject: {} & typeof source = lang.deepAssign(object, source);

		assert.strictEqual(object, assignedObject, 'deepAssign should return the modified target object');
		assert.isUndefined(assignedObject.a, 'deepAssign should not copy inherited properties');
		assert.isUndefined(assignedObject.b, 'deepAssign should not copy non-enumerable properties');
		assert.strictEqual(assignedObject.c.d, 3);
		assert.strictEqual(assignedObject.c.e.length, 3);
		assert.notStrictEqual(assignedObject.c.e[1], source.c.e[1], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(assignedObject.c.e[2], source.c.e[2], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(assignedObject.c.e, source.c.e, 'deepAssign should perform a deep copy');
	},

	'.deepAssign() merges nested object on to the target'() {
		const target = {
			apple: 0,
			banana: {
				weight: 52,
				price: 100,
				details: {
					colour: 'brown', texture: 'soft'
				}
			},
			cherry: 97
		};

		const source = {
			banana: { price: 200, details: { colour: 'yellow' } },
			durian: 100
		};

		const assignedObject = lang.deepAssign(target, source);
		assert.deepEqual(assignedObject, {
			apple: 0,
			banana: { weight: 52, price: 200, details: { colour: 'yellow', texture: 'soft' } },
			cherry: 97,
			durian: 100
		});
	},

	'.deepAssign() objects with circular references'() {
		const target: any = {
			nested: {
				baz: 'foo',
				qux: 'baz'
			}
		};

		target.cyclical = target;

		const source: any = {
			nested: {
				foo: 'bar',
				bar: 'baz',
				baz: 'qux'
			}
		};
		source.cyclical = source;

		const assignedObject = lang.deepAssign(target, source);
		assert.deepEqual(assignedObject.nested, { foo: 'bar', bar: 'baz', baz: 'qux', qux: 'baz' });
	},

	'.deepAssign with a source with two properties holding the same reference'() {
		const target: any = {};

		const foo = {
			foo: 'bar'
		};

		const source: any = {
			bar: foo,
			baz: foo,
			qux: {
				foo,
				bar: {
					foo
				}
			}
		};

		const assignedObject = lang.deepAssign(target, source);
		assert.deepEqual(assignedObject, { bar: { foo: 'bar' }, baz: { foo: 'bar' }, qux: { foo: { foo: 'bar' }, bar: { foo: { foo: 'bar' } } } });
	},

	'.mixin()'() {
		const source: {
			a: number,
			c: number,
			nested: {
				a: number
			},
			b: number,
			hidden: number
		} = <any> Object.create({
			a: 1
		});
		source.c = 3;
		source.nested = { a: 5 };
		Object.defineProperty(source, 'b', {
			enumerable: true,
			get: function () {
				return 2;
			}
		});
		Object.defineProperty(source, 'hidden', {
			enumerable: false,
			value: 4
		});

		const object: {} = Object.create(null);
		const mixedObject = lang.mixin(object, source);

		assert.strictEqual(object, mixedObject, 'mixin should return the modified target object');
		assert.strictEqual(mixedObject.a, 1, 'mixin should copy inherited properties');
		assert.strictEqual(mixedObject.b, 2);
		assert.strictEqual(mixedObject.c, 3);
		assert.isUndefined(mixedObject.hidden, 'mixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested, source.nested, 'mixin should perform a shallow copy');
		assert.strictEqual(mixedObject.nested.a, 5);
	},

	'.mixin() - multiple sources'() {
		const source1 = {
			a: 12,
			b: false
		};
		const source2 = {
			c: 'string'
		};
		const mixedObject = lang.mixin({}, source1, source2);

		assert.strictEqual(mixedObject.a, 12);
		assert.strictEqual(mixedObject.b, false);
		assert.strictEqual(mixedObject.c, 'string');
	},

	'.deepMixin()'() {
		const source: {
			nested: {
				a: number,
				b: any[]
			},
			a: number,
			b: number,
			c: number,
			d: Date,
			e: RegExp,
			hidden: number
		} = <any> Object.create({
			nested: {
				a: 1,
				b: [ 2, [ 3 ], { f: 4 } ]
			}
		});
		source.a = 1;
		source.c = 3;
		source.d = new Date();
		source.e = /abc/;
		Object.defineProperty(source, 'b', {
			enumerable: true,
			get: function () {
				return 2;
			}
		});
		Object.defineProperty(source, 'hidden', {
			enumerable: false,
			value: 4
		});

		const object: {} = Object.create(null);
		const mixedObject: {} & typeof source = lang.deepMixin(object, source);

		assert.strictEqual(object, mixedObject, 'deepMixin should return the modified target object');
		assert.strictEqual(mixedObject.a, 1);
		assert.strictEqual(mixedObject.b, 2);
		assert.strictEqual(mixedObject.c, 3);
		assert.strictEqual(mixedObject.d, source.d, 'deepMixin should not deep copy Date object');
		assert.strictEqual(mixedObject.e, source.e, 'deepMixin should not deep copy RegExp object');
		assert.isUndefined(mixedObject.hidden, 'deepMixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested.a, 1, 'deepMixin should copy inherited properties');
		assert.notStrictEqual(mixedObject.nested, source.nested, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b, source.nested.b, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[1], source.nested.b[1], 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[2], source.nested.b[2], 'deepMixin should perform a deep copy');
	},

	'.deepMixin() merges nested object on to the target'() {
		const target = Object.create({
			apple: 0,
			banana: {
				weight: 52,
				price: 100,
				details: {
					colour: 'brown', texture: 'soft'
				}
			},
			cherry: 97
		});

		const source = Object.create({
			banana: { price: 200, details: { colour: 'yellow' } },
			durian: 100
		});

		const assignedObject = lang.deepMixin(target, source);
		assert.deepEqual(assignedObject, {
			apple: 0,
			banana: { weight: 52, price: 200, details: { colour: 'yellow', texture: 'soft' } },
			cherry: 97,
			durian: 100
		});
	},

	'.deepMixin() objects with circular references'() {
		let target: any = {
			nested: {
				baz: 'foo',
				qux: 'baz'
			}
		};

		target.cyclical = target;

		target = Object.create(target);

		let source: any = {
			nested: {
				foo: 'bar',
				bar: 'baz',
				baz: 'qux'
			}
		};
		source.cyclical = source;
		source = Object.create(source);

		const assignedObject = lang.deepMixin(target, source);
		assert.deepEqual(assignedObject.nested, { foo: 'bar', bar: 'baz', baz: 'qux', qux: 'baz' });
	},

	'.create()'() {
		const prototype = {
			a: 1
		};
		const mixin: {
			lorem: string,
			b: {
				enumerable: boolean,
				configurable: boolean,
				writable: boolean,
				value: {
					c: number
				}
			},
			d: {
				enumerable: boolean,
				configurable: boolean,
				writable: boolean,
				value: number
			},
			e: {
				value: number
			}
		} = Object.create({ lorem: 'ipsum' }, {
			b: {
				enumerable: true,
				configurable: true,
				writable: true,
				value: { c: 2 }
			},
			d: {
				enumerable: true,
				configurable: true,
				writable: false,
				value: 3
			},
			e: {
				value: 4
			}
		});
		const object: typeof prototype & typeof mixin = lang.create(prototype, mixin);

		assert.strictEqual(Object.getPrototypeOf(object), prototype);
		assert.strictEqual(object.b, mixin.b);
		assert.isTrue(Object.getOwnPropertyDescriptor(object, 'd')!.writable);
		assert.isUndefined(object.e);
		assert.isUndefined(object.lorem);
		assert.throw(function () {
			lang.create({});
		});
	},

	'.duplicate()'() {
		const prototype = {
			a: 1
		};
		const source: {
			a: number,
			b: {
				value: number
			},
			c: {
				d: number
			}
		} = Object.create(prototype, {
			b: { value: 2 }
		});
		source.c = { d: 4 };

		const copyOfObject: typeof source = lang.duplicate(source);

		assert.strictEqual(Object.getPrototypeOf(copyOfObject), prototype);
		assert.strictEqual(copyOfObject.a, 1);
		assert.isUndefined(copyOfObject.b);
		assert.strictEqual(copyOfObject.c.d, 4);
		assert.notStrictEqual(copyOfObject.c, source.c);
	},

	'.isIdentical()'() {
		assert.isTrue(lang.isIdentical(2, 2));
		assert.isTrue(lang.isIdentical(NaN, NaN));
		assert.isFalse(lang.isIdentical(3, NaN));
		assert.isFalse(lang.isIdentical(3, '3'));
		assert.isTrue(lang.isIdentical(Infinity, Infinity));
	},

	'.lateBind() context'() {
		const object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		const method = lang.lateBind(object, 'method');
		object.method = function (this: any): any {
			return this;
		};

		assert.strictEqual(method(), object, 'lateBind\'s context should be `object`.');
	},

	'.lateBind() arguments'() {
		const object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		const method = lang.lateBind(object, 'method', 'The', 'quick', 'brown');
		const methodNoArgs = lang.lateBind(object, 'method');
		const suffix = 'fox jumped over the lazy dog';
		object.method = function (...parts: string[]): string {
			return parts.join(' ');
		};

		assert.strictEqual(method(suffix), 'The quick brown ' + suffix,
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
		assert.strictEqual(methodNoArgs(suffix), suffix,
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
		assert.strictEqual(method(), 'The quick brown',
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
	},

	'.partial()'() {
		const ending = 'jumps over the lazy dog';
		const finish = lang.partial(function (this: any) {
			const start = this && this.start ? [ this.start ] : [];

			return start.concat(Array.prototype.slice.call(arguments)).join(' ');
		}, 'jumps', 'over');

		function Sentence(this: any, start: string = '') {
			this.start = start;
		}
		Sentence.prototype.finish = finish;

		assert.strictEqual(finish('the lazy dog'), ending,
			'The arguments supplied to `lang.partial` should be prepended to the arguments list of the ' +
			'original function.');
		assert.strictEqual(finish(), 'jumps over',
			'The arguments supplied to `lang.partial` should still be used even if no arguments are passed to the ' +
			'wrapped function.');
		assert.strictEqual(new (<any> Sentence)('The quick brown fox').finish('the lazy dog'),
			'The quick brown fox ' + ending,
			'A function passed to `lang.partial` should inherit its context.');
	},

	'.createHandle'() {
		let count = 0;
		const handle = lang.createHandle(function(): void {
			++count;
		});

		handle.destroy();
		assert.strictEqual(count, 1);

		handle.destroy();
		assert.strictEqual(count, 1, 'destroy should be a no-op on subsequent calls');
	},

	'.createCompositeHandle'() {
		let count = 0;
		function destructor(): void {
			++count;
		}
		const handle = lang.createCompositeHandle(
			lang.createHandle(destructor),
			lang.createHandle(destructor)
		);

		handle.destroy();
		assert.strictEqual(count, 2, 'both destructors in the composite handle should have been called');
		handle.destroy();
		assert.strictEqual(count, 2, 'destructors are not called after handle destruction');
	}
});
