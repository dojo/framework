import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import {isIdentical, copy, lateBind, partial} from 'src/lang';

registerSuite({
	name: 'lang functions',

	'.copy() invalid arguments': function () {
		assert.throw(function () {
			copy({
				sources: []
			});
		});
	},

	'.copy() simple': function () {
		var copyofObject = copy({
			sources: [{a: 1}]
		});
		assert.equal(copyofObject.a, 1);
	},

	'.copy() inherited': function () {
		var prototype = {
			a: 1
		};
		var inheriting = Object.create(prototype);
		inheriting.b = 2;
		var copyofInherited = copy({
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
		var copyOfObject: any = copy({
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
		var copyOfObject: any = copy({
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
		var copyOfObject: any = copy({
			descriptors: true,
			sources: [object]
		});
		assert.equal(copyOfObject.a, 1);
		assert.equal(copyOfObject.b, 2);
		assert.isFunction(Object.getOwnPropertyDescriptor(copyOfObject, 'b').get);
		assert.equal(copyOfObject.c, 3);
		assert.equal(copyOfObject.hidden, 4);
		assert.equal(copyOfObject.nested, object.nested);
		assert.equal(copyOfObject.nested.a, 5);
	},

	'.isIdentical()': function () {
		assert.isTrue(isIdentical(2, 2));
		assert.isTrue(isIdentical(NaN, NaN));
		assert.isFalse(isIdentical(3, NaN));
		assert.isFalse(isIdentical(3, '3'));
		assert.isTrue(isIdentical(Infinity, Infinity));
	},

	'.lateBind() context': function () {
		var object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		var method = lateBind(object, 'method');
		object.method = function (): any {
			return this;
		};

		assert.equal(method(), object, 'lateBind\'s context should be `object`.');
	},

	'.lateBind() arguments': function () {
		var object: {
			method?: (...args: string[]) => string;
		} = <any> {};
		var method = lateBind(object, 'method', 'The', 'quick', 'brown');
		var methodNoArgs = lateBind(object, 'method');
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
		var finish = partial(function () {
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
