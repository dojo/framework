import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import has from 'src/has';
import * as lang from 'src/lang';
import { PropertyEvent } from 'src/observers/interfaces';
import { Es5Observer, Es7Observer } from 'src/observers/ObjectObserver';

registerSuite({
	name: 'lang functions',

	'.copy() invalid arguments': function () {
		assert.throw(function () {
			lang.copy({
				sources: []
			});
		});
	},

	'.copy() simple': function () {
		var copyOfObject = lang.copy({
			sources: [{a: 1}]
		});
		assert.equal(copyOfObject.a, 1);
	},

	'.copy() inherited': function () {
		var prototype = {
			a: 1
		};
		var inheriting = Object.create(prototype);
		inheriting.b = 2;
		var copyofInherited = lang.copy({
			inherited: true,
			sources: [ inheriting ]
		});
		assert.equal(copyofInherited.a, 1);
		assert.equal(copyofInherited.b, 2);
	},

	'.copy() deep': function () {
		var nested = {
			a: {
				b: 1
			}
		};
		var copyOfObject: any = lang.copy({
			deep: true,
			sources: [ nested ]
		});
		assert.equal(copyOfObject.a.b, 1);
		assert.notEqual(copyOfObject.a, nested.a);
	},

	'.copy() deep arrays': function () {
		var nested = {
			a: {
				b: [ 1 ]
			}
		};
		var copyOfObject: any = lang.copy({
			deep: true,
			sources: [ nested ]
		});

		assert.equal(copyOfObject.a.b[0], 1);
		assert.notEqual(copyOfObject.a.b, nested.a.b);
	},

	'.copy() descriptors': function () {
		var object: any = {
			a: 1
		};
		Object.defineProperty(object, 'b', {
				get: function () {
					return 2;
				}
			});
		Object.defineProperty(object, 'c', {
				enumerable: true,
				configurable: true,
				writable: true,
				value: 3
			});
		Object.defineProperty(object, 'hidden', {
				enumerable: false,
				value: 4
			});
		Object.defineProperty(object, 'nested', {
				value: {
					a: 5
				}
			});
		var copyOfObject: any = lang.copy({
			descriptors: true,
			inherited: true,
			sources: [object]
		});
		assert.equal(copyOfObject.a, 1);
		assert.equal(copyOfObject.b, 2);
		assert.isFunction(Object.getOwnPropertyDescriptor(copyOfObject, 'b').get);
		assert.equal(copyOfObject.c, 3);
		assert.equal(copyOfObject.hidden, 4);
		assert.equal(copyOfObject.nested, object.nested);
		assert.equal(copyOfObject.nested.a, 5);
		assert.sameMembers(Object.getOwnPropertyNames(copyOfObject), [ 'a', 'b', 'c', 'hidden', 'nested' ]);
	},

	'.create()': function () {
		var prototype = {
			a: 1
		};
		var mixinPrototype = { lorem: 'ipsum' };
		var mixin: any = Object.create(mixinPrototype, {
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
		var object: any = lang.create(prototype, mixin);

		assert.equal(Object.getPrototypeOf(object), prototype);
		assert.equal(object.b, mixin.b);
		assert.isTrue(Object.getOwnPropertyDescriptor(object, 'd').writable);
		assert.isUndefined(object.e);
		assert.isUndefined(object.lorem);
		assert.throw(function () {
			lang.create({});
		});
	},

	'.duplicate()': function () {
		var prototype = {
			a: 1
		};
		var object: any = Object.create(prototype, {
			b: { value: 2 },
			c: {
				configurable: false,
				value: 3
			},
			d: {
				value: {
					e: 4
				}
			}
		});
		var copyOfObject: any = lang.duplicate(object);

		assert.equal(Object.getPrototypeOf(copyOfObject), prototype);
		assert.equal(copyOfObject.a, 1);
		assert.equal(copyOfObject.b, 2);
		assert.equal(copyOfObject.c, 3);
		assert.equal(copyOfObject.d.e, 4);
		assert.notEqual(copyOfObject.d, object.d);
		assert.isFalse(Object.getOwnPropertyDescriptor(copyOfObject, 'c').configurable);
	},

	'.observe() when nextTurn is true': function () {
		if (!has('object-observe')) {
			this.skip('Native Object.observe support is required for this test.');
		}

		let observer = lang.observe({
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

		let observer = lang.observe({
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

		let observer = lang.observe({
			target: {},
			listener: function () {},
			nextTurn: true,
			onlyReportObserved: true
		});
		assert.isTrue(observer.onlyReportObserved, 'onlyReportObserved should be passed to the observer instance.');
	},

	'.getPropertyDescriptor()': function () {
		var object1 = {
			get foo() { return 'bar'; }
		};
		var object2 = Object.create(object1);
		var object3 = Object.create(object1, {
			foo: {
				get: function () { return 'baz'; }
			}
		});

		assert.deepEqual(lang.getPropertyDescriptor(object1, 'foo'), Object.getOwnPropertyDescriptor(object1, 'foo'));
		assert.deepEqual(lang.getPropertyDescriptor(object2, 'foo'), Object.getOwnPropertyDescriptor(object1, 'foo'));
		assert.deepEqual(lang.getPropertyDescriptor(object3, 'foo'), Object.getOwnPropertyDescriptor(object3, 'foo'));
	},

	'.getPropertyNames()': function () {
		var prototype = {
			a: 1,
			b: 7
		};
		var object: any = Object.create(prototype, {
			b: { value: 2 },
			c: {
				configurable: false,
				value: 3
			},
			d: {
				value: {
					e: 4
				}
			}
		});
		var names: string[] = lang.getPropertyNames(object);

		assert.sameMembers(names, [ 'a', 'b', 'c', 'd' ]);
	},

	'.isIdentical()': function () {
		assert.isTrue(lang.isIdentical(2, 2));
		assert.isTrue(lang.isIdentical(NaN, NaN));
		assert.isFalse(lang.isIdentical(3, NaN));
		assert.isFalse(lang.isIdentical(3, '3'));
		assert.isTrue(lang.isIdentical(Infinity, Infinity));
	},

	'.lateBind() context': function () {
		var object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		var method = lang.lateBind(object, 'method');
		object.method = function (): any {
			return this;
		};

		assert.equal(method(), object, 'lateBind\'s context should be `object`.');
	},

	'.lateBind() arguments': function () {
		var object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		var method = lang.lateBind(object, 'method', 'The', 'quick', 'brown');
		var methodNoArgs = lang.lateBind(object, 'method');
		var suffix = 'fox jumped over the lazy dog';
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
		var ending = 'jumped over the lazy dog';
		var finish = lang.partial(function () {
			var start = this.start ? [ this.start ] : [];

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
	}
});
