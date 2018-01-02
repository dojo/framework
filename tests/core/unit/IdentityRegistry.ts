const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Symbol from '@dojo/shim/Symbol';
import { from as arrayFrom } from '@dojo/shim/array';

import IdentityRegistry from '../../src/IdentityRegistry';

class Value {}

const idSymbol = Symbol('id');
// Store the expected string due to <https://github.com/dojo/core/issues/170>.
const idSymbolString = idSymbol.toString();

registerSuite('IdentityRegistry', {
	'#get': {
		'string id was not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.throws(() => registry.get('id'), Error, "Could not find a value for identity 'id'");
		},

		'symbol id was not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.throws(
				() => registry.get(idSymbol),
				Error,
				"Could not find a value for identity '" + idSymbolString + "'"
			);
		},

		registered() {
			const registry = new IdentityRegistry<Value>();
			const expected = new Value();
			registry.register('id', expected);
			assert.strictEqual(registry.get('id'), expected);
		}
	},

	'#contains': {
		'not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.isFalse(registry.contains(new Value()));
		},

		registered() {
			const registry = new IdentityRegistry<Value>();
			const value = new Value();
			registry.register('id', value);
			assert.isTrue(registry.contains(value));
		}
	},

	delete: {
		'not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.isFalse(registry.delete('id'));
		},

		registered() {
			const registry = new IdentityRegistry<Value>();
			registry.register('id', new Value());
			assert.isTrue(registry.has('id'));
			assert.isTrue(registry.delete('id'));
			assert.isFalse(registry.has('id'));
		}
	},

	'#has': {
		'not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.isFalse(registry.has('id'));
		},

		registered() {
			const registry = new IdentityRegistry<Value>();
			registry.register('id', new Value());
			assert.isTrue(registry.has('id'));
		}
	},

	'#identify': {
		'not registered'() {
			const registry = new IdentityRegistry<Value>();
			assert.throws(() => registry.identify(new Value()), Error, 'Could not identify non-registered value');
		},

		registered() {
			const registry = new IdentityRegistry<Value>();
			const value = new Value();
			const expected = Symbol();
			registry.register(expected, value);
			assert.strictEqual(registry.identify(value), expected);
		}
	},

	'#register': {
		ok() {
			const registry = new IdentityRegistry<Value>();
			const expected = new Value();
			registry.register('id', expected);
			assert.strictEqual(registry.get('id'), expected);
		},

		'string id is already used'() {
			const registry = new IdentityRegistry<Value>();
			registry.register('id', new Value());
			assert.throws(
				() => {
					registry.register('id', new Value());
				},
				Error,
				'A value has already been registered for the given identity (id)'
			);
		},

		'symbol id is already used'() {
			const registry = new IdentityRegistry<Value>();
			const id = idSymbol;
			registry.register(id, new Value());
			assert.throws(
				() => {
					registry.register(id, new Value());
				},
				Error,
				'A value has already been registered for the given identity (' + idSymbolString + ')'
			);
		},

		'value has already been registered with a different (string) id'() {
			const registry = new IdentityRegistry<Value>();
			const value = new Value();
			registry.register('id1', value);
			assert.throws(
				() => {
					registry.register(Symbol('id2'), value);
				},
				Error,
				'The value has already been registered with a different identity (id1)'
			);
		},

		'value has already been registered with a different (symbol) id'() {
			const registry = new IdentityRegistry<Value>();
			const value = new Value();
			const id1Symbol = Symbol('id1');
			registry.register(id1Symbol, value);
			assert.throws(
				() => {
					registry.register('id2', value);
				},
				Error,
				'The value has already been registered with a different identity (' + id1Symbol.toString() + ')'
			);
		},

		'value has already been registered with the same id'() {
			const registry = new IdentityRegistry<Value>();
			const value = new Value();
			const expected = registry.register('id', value);
			const actual = registry.register('id', value);
			assert.strictEqual(actual, expected);
		},

		'returns handle'() {
			const registry = new IdentityRegistry<Value>();
			const handle = registry.register('id', new Value());
			assert.isTrue(registry.has('id'));
			handle.destroy();
			assert.isFalse(registry.has('id'));
		},

		'destroying handle more than once is a noop'() {
			const registry = new IdentityRegistry<Value>();
			const handle = registry.register('id', new Value());
			assert.isTrue(registry.has('id'));
			handle.destroy();
			handle.destroy();
			assert.isFalse(registry.has('id'));
		}
	},

	'#values'() {
		const value1 = new Value();
		const value2 = new Value();
		const value3 = new Value();

		const registry = new IdentityRegistry<Value>();
		registry.register('id1', value1);
		registry.register('id2', value2);
		registry.register('id3', value3);

		assert.deepEqual(arrayFrom(registry.values()), [value1, value2, value3]);
	},

	'#ids'() {
		const value1 = new Value();
		const value2 = new Value();
		const value3 = new Value();

		const registry = new IdentityRegistry<Value>();
		registry.register('id1', value1);
		registry.register('id2', value2);
		registry.register('id3', value3);

		assert.deepEqual(arrayFrom(registry.ids()), ['id1', 'id2', 'id3']);
	},

	'#entries'() {
		const value1 = new Value();
		const value2 = new Value();
		const value3 = new Value();

		const registry = new IdentityRegistry<Value>();
		registry.register('id1', value1);
		registry.register('id2', value2);
		registry.register('id3', value3);

		assert.deepEqual(arrayFrom(registry.entries()), [['id1', value1], ['id2', value2], ['id3', value3]]);
	},

	iterator() {
		const value1 = new Value();
		const value2 = new Value();
		const value3 = new Value();

		const registry = new IdentityRegistry<Value>();
		registry.register('id1', value1);
		registry.register('id2', value2);
		registry.register('id3', value3);

		assert.deepEqual(arrayFrom(registry), [['id1', value1], ['id2', value2], ['id3', value3]]);
	}
});
