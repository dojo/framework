import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as lang from 'src/lang';

registerSuite({
	name: 'lang functions',

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
		const assignedObject: typeof object & typeof source = lang.assign(object, source);

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

		lang.assign<typeof object, typeof source1 | typeof source3>(object, source1, null, source3);

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
		let source1:  { a: number, b: number } | { c: number, d: number } = {
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

		const assignedObject = lang.assign(object, source1, source2, source3);

		assert(assignedObject);

		// Verify that the inferred type is what we expect
		const alsoAssigned: {} & ({ a: number, b: number } | { c: number, d: number }) = lang.assign(object, source1, source2, source3);

		assert(alsoAssigned);
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

	'.mixin()'() {
		const source: {
			a: number,
			c: number,
			nested: {
				a: number
			},
			b: number,
			hidden: number
		} = Object.create({
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
		const mixedObject: {} & typeof source = lang.mixin(object, source);

		assert.strictEqual(object, mixedObject, 'mixin should return the modified target object');
		assert.strictEqual(mixedObject.a, 1, 'mixin should copy inherited properties');
		assert.strictEqual(mixedObject.b, 2);
		assert.strictEqual(mixedObject.c, 3);
		assert.isUndefined(mixedObject.hidden, 'mixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested, source.nested, 'mixin should perform a shallow copy');
		assert.strictEqual(mixedObject.nested.a, 5);
	},

	'.deepMixin()'() {
		const source: {
			nested: {
				a: number,
				b: any[]
			},
			a: number,
			c: number,
			b: number,
			hidden: number
		} = Object.create({
			nested: {
				a: 1,
				b: [ 2, [ 3 ], { f: 4 } ]
			}
		});
		source.a = 1;
		source.c = 3;
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
		assert.isUndefined(mixedObject.hidden, 'deepMixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested.a, 1, 'deepMixin should copy inherited properties');
		assert.notStrictEqual(mixedObject.nested, source.nested, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b, source.nested.b, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[1], source.nested.b[1], 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[2], source.nested.b[2], 'deepMixin should perform a deep copy');
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
		assert.isTrue(Object.getOwnPropertyDescriptor(object, 'd').writable);
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
		object.method = function (): any {
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
		const finish = lang.partial(function () {
			const start = this && this.start ? [ this.start ] : [];

			return start.concat(Array.prototype.slice.call(arguments)).join(' ');
		}, 'jumps', 'over');

		function Sentence(start: string = '') {
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
