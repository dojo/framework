import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as lang from 'src/lang';

registerSuite({
	name: 'lang functions',

	'.assign()'() {
		const source = Object.create({ a: 1 }, {
			b: {
				enumerable: false,
				configurable: true,
				writable: true,
				value: 2
			}
		});
		source.c = 3;
		source.nested = { a: 5 };

		const object: any = Object.create(null);
		const assignedObject: any = lang.assign(object, source);

		assert.strictEqual(object, assignedObject, 'assign should return the modified target object');
		assert.isUndefined(object.a, 'assign should not copy inherited properties');
		assert.isUndefined(object.b, 'assign should not copy non-enumerable properties');
		assert.strictEqual(object.c, 3);
		assert.strictEqual(object.nested, source.nested, 'assign should perform a shallow copy');
		assert.strictEqual(object.nested.a, 5);
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

		const object: any = {
			property1: 'value1',
			property2: 'value2'
		};

		lang.assign(object, source1, null, source3);

		assert.deepEqual(object, {
			property1: 'value1',
			property2: 'value2',
			property3: 'value3',
			property4: 'value4',
			property7: 'value7',
			property8: 'value8'
		});
	},

	'.deepAssign()'() {
		const source = Object.create({ a: 1 }, {
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

		const object: any = Object.create(null);
		const assignedObject: any = lang.deepAssign(object, source);

		assert.strictEqual(object, assignedObject, 'deepAssign should return the modified target object');
		assert.isUndefined(object.a, 'deepAssign should not copy inherited properties');
		assert.isUndefined(object.b, 'deepAssign should not copy non-enumerable properties');
		assert.strictEqual(object.c.d, 3);
		assert.strictEqual(object.c.e.length, 3);
		assert.notStrictEqual(object.c.e[1], source.c.e[1], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(object.c.d[2], source.c.e[2], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(object.c.e, source.c.e, 'deepAssign should perform a deep copy');
	},

	'.mixin()'() {
		const source = Object.create({
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

		const object: any = Object.create(null);
		const mixedObject: any = lang.mixin(object, source);

		assert.strictEqual(object, mixedObject, 'mixin should return the modified target object');
		assert.strictEqual(object.a, 1, 'mixin should copy inherited properties');
		assert.strictEqual(object.b, 2);
		assert.strictEqual(object.c, 3);
		assert.isUndefined(object.hidden, 'mixin should not copy non-enumerable properties');
		assert.strictEqual(object.nested, source.nested, 'mixin should perform a shallow copy');
		assert.strictEqual(object.nested.a, 5);
	},

	'.deepMixin()'() {
		const source = Object.create({
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

		const object: any = Object.create(null);
		const mixedObject: any = lang.deepMixin(object, source);

		assert.strictEqual(object, mixedObject, 'deepMixin should return the modified target object');
		assert.strictEqual(object.a, 1);
		assert.strictEqual(object.b, 2);
		assert.strictEqual(object.c, 3);
		assert.isUndefined(object.hidden, 'deepMixin should not copy non-enumerable properties');
		assert.strictEqual(object.nested.a, 1, 'deepMixin should copy inherited properties');
		assert.notStrictEqual(object.nested, source.nested, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(object.nested.b, source.nested.b, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(object.nested.b[1], source.nested.b[1], 'deepMixin should perform a deep copy');
		assert.notStrictEqual(object.nested.b[2], source.nested.b[2], 'deepMixin should perform a deep copy');
	},

	'.create()'() {
		const prototype = {
			a: 1
		};
		const mixin: any = Object.create({ lorem: 'ipsum' }, {
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
		const object: any = lang.create(prototype, mixin);

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
		const source: any = Object.create(prototype, {
			b: { value: 2 }
		});
		source.c = { d: 4 };
		const copyOfObject: any = lang.duplicate(source);

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
			const start = this.start ? [ this.start ] : [];

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
