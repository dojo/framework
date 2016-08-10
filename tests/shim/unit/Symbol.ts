import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Symbol, { isSymbol } from 'src/Symbol';
import has from 'src/support/has';

registerSuite({
	name: 'Symbol',
	native: function (this: any) {
		if (!has('es6-symbol')) {
			this.skip('checking native implementation');
		}
		assert.include(Symbol.toString(), 'native', 'native implementation should represent native code');
	},
	'creation - assignment': function () {
		const test = Symbol('test');
		const x: any = {};
		/* TypeScript's lib says that the property can only be string, when in fact symbol can be accepted */
		Object.defineProperty(x, <any> test, { value: 'foo', writable: true, configurable: true });
		assert.isUndefined(x.test, 'test does not exist as a key');
		assert.strictEqual(x[test], 'foo', 'value is properly set');
		assert.notInstanceOf(x, Symbol, 'x should not be instance of Symbol');
		assert.isTrue(isSymbol(test));
	},
	'built in symbols': function () {
		assert.isTrue(isSymbol(Symbol.hasInstance));
		assert.isTrue(isSymbol(Symbol.isConcatSpreadable));
		assert.isTrue(isSymbol(Symbol.iterator));
		assert.isTrue(isSymbol(Symbol.match));
		assert.isTrue(isSymbol(Symbol.replace));
		assert.isTrue(isSymbol(Symbol.search));
		assert.isTrue(isSymbol(Symbol.species));
		assert.isTrue(isSymbol(Symbol.split));
		assert.isTrue(isSymbol(Symbol.toPrimitive));
		assert.isTrue(isSymbol(Symbol.toStringTag));
		assert.isTrue(isSymbol(Symbol.unscopables));
	},
	'property descriptor': function () {
		const test = Symbol('test');
		const x: any = {};
		x[test] = 'foo';
		if (has('es6-symbol')) {
			assert.deepEqual(Object.getOwnPropertyDescriptor(x, <any> test), {
				configurable: true,
				enumerable: true,
				value: 'foo',
				writable: true
			});
		}
		else {
			assert.deepEqual(Object.getOwnPropertyDescriptor(x, <any> test), {
				configurable: true,
				enumerable: false,
				value: 'foo',
				writable: true
			});
		}
	},
	'Symbol.for/Symbol.keyFor': function () {
		const test = Symbol.for('foo');
		assert.isTrue(isSymbol(test), 'is a symbol');
		assert.strictEqual(test, Symbol.for('foo'), 'same symbol returned');
		assert.strictEqual(Symbol.keyFor(test), 'foo');
	},
	'does throw': function () {
		assert.throws(function () {
			new (<any> Symbol)('foo');
		}, TypeError, 'not a constructor');
	}
});
