import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import has from 'src/has';
import * as lang from 'src/lang';
import { PropertyEvent } from 'src/observers/interfaces';
import { Es5Observer, Es7Observer } from 'src/observers/ObjectObserver';

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

		const copyOfObject: any = lang.assign(Object.create(null), source);
		assert.isUndefined(copyOfObject.a);
		assert.isUndefined(copyOfObject.b);
		assert.strictEqual(copyOfObject.c, 3);
		assert.strictEqual(copyOfObject.nested, source.nested);
		assert.strictEqual(copyOfObject.nested.a, 5);
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

		const copyOfObject: any = lang.deepAssign(Object.create(null), source);
		assert.isUndefined(copyOfObject.a);
		assert.isUndefined(copyOfObject.b);
		assert.strictEqual(copyOfObject.c.d, 3);
		assert.strictEqual(copyOfObject.c.e.length, 3);
		assert.notStrictEqual(copyOfObject.c.e[1], source.c.e[1]);
		assert.notStrictEqual(copyOfObject.c.d[2], source.c.e[2]);
		assert.notStrictEqual(copyOfObject.c.e, source.c.e);
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
		const copyOfObject: any = lang.mixin(Object.create(null), source);

		assert.strictEqual(copyOfObject.a, 1);
		assert.strictEqual(copyOfObject.b, 2);
		assert.strictEqual(copyOfObject.c, 3);
		assert.isUndefined(copyOfObject.hidden);
		assert.strictEqual(copyOfObject.nested, source.nested);
		assert.strictEqual(copyOfObject.nested.a, 5);
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
		const copyOfObject: any = lang.deepMixin(Object.create(null), source);

		assert.strictEqual(copyOfObject.a, 1);
		assert.strictEqual(copyOfObject.b, 2);
		assert.strictEqual(copyOfObject.c, 3);
		assert.isUndefined(copyOfObject.hidden);
		assert.strictEqual(copyOfObject.nested.a, 1);
		assert.notStrictEqual(copyOfObject.nested, source.nested);
		assert.notStrictEqual(copyOfObject.nested.b, source.nested.b);
		assert.notStrictEqual(copyOfObject.nested.b[1], source.nested.b[1]);
		assert.notStrictEqual(copyOfObject.nested.b[2], source.nested.b[2]);
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

	'.observe() when nextTurn is true': function () {
		if (!has('object-observe')) {
			this.skip('Native Object.observe support is required for this test.');
		}

		const observer = lang.observe({
			target: {},
			listener: function () {},
			nextTurn: true
		});
		assert.isTrue(observer instanceof Es7Observer);
	},

	'.observe() when nextTurn is false': function () {
		if (!has('object-observe')) {
			this.skip('Native Object.observe support is required for this test.');
		}

		const observer = lang.observe({
			target: {},
			listener: function () {},
			nextTurn: false
		});
		assert.isTrue(observer instanceof Es5Observer);
	},

	'.observe() onlyReportObserved': function () {
		if (!has('object-observe')) {
			this.skip('Native Object.observe support is required for this test.');
		}

		const observer = lang.observe({
			target: {},
			listener: function () {},
			nextTurn: true,
			onlyReportObserved: true
		});
		assert.isTrue(observer.onlyReportObserved, 'onlyReportObserved should be passed to the observer instance.');
	},

	'.isIdentical()': function () {
		assert.isTrue(lang.isIdentical(2, 2));
		assert.isTrue(lang.isIdentical(NaN, NaN));
		assert.isFalse(lang.isIdentical(3, NaN));
		assert.isFalse(lang.isIdentical(3, '3'));
		assert.isTrue(lang.isIdentical(Infinity, Infinity));
	},

	'.lateBind() context': function () {
		const object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		const method = lang.lateBind(object, 'method');
		object.method = function (): any {
			return this;
		};

		assert.equal(method(), object, 'lateBind\'s context should be `object`.');
	},

	'.lateBind() arguments': function () {
		const object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		const method = lang.lateBind(object, 'method', 'The', 'quick', 'brown');
		const methodNoArgs = lang.lateBind(object, 'method');
		const suffix = 'fox jumped over the lazy dog';
		object.method = function (...parts: string[]): string {
			return parts.join(' ');
		};

		assert.equal(method(suffix), 'The quick brown ' + suffix,
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
		assert.equal(methodNoArgs(suffix), suffix,
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
		assert.equal(method(), 'The quick brown',
			'lateBind\'s additional arguments should be prepended to the wrapped function.');
	},

	'.partial()': function () {
		const ending = 'jumped over the lazy dog';
		const finish = lang.partial(function () {
			const start = this.start ? [ this.start ] : [];

			return start.concat(Array.prototype.slice.call(arguments)).join(' ');
		}, 'jumped', 'over');

		function Sentence(start: string = '') {
			this.start = start;
		}
		Sentence.prototype.finish = finish;

		assert.equal(finish('the lazy dog'), ending, 'The arguments supplied to `lang.partial` should be prepended' +
			' to the arguments list of the returned function.');
		assert.equal(new (<any> Sentence)('The quick brown fox').finish('the lazy dog'),
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
