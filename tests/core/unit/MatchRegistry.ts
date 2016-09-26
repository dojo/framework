import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import MatchRegistry from 'src/MatchRegistry';

function stringTest(value: string) {
	return (...args: any[]): boolean => {
		return value === args[0];
	};
}

registerSuite({
	name: 'MatchRegistry',

	'#match'() {
		const registry = new MatchRegistry<any>();
		const handler = () => {};
		registry.register((name: string) => {
			return name === 'foo';
		}, handler);
		assert.strictEqual(registry.match('foo'), handler);
		assert.throws(() => registry.match('bar'));
	},

	'#register': {
		multiple() {
			const registry = new MatchRegistry<any>();
			const handler = () => {};
			registry.register(stringTest('foo'), handler);
			registry.register(stringTest('foo'), () => {});
			assert.strictEqual(registry.match('foo'), handler);
		},

		first() {
			const registry = new MatchRegistry<number>();
			registry.register(stringTest('foo'), 1);
			registry.register(stringTest('foo'), 2, true);
			assert.strictEqual(registry.match('foo'), 2);
			registry.register(stringTest('foo'), 3, true);
			assert.notEqual(registry.match('foo'), 2);
		},

		destroy() {
			const registry = new MatchRegistry<number>(2);
			const handle = registry.register(stringTest('foo'), 1);
			assert.equal(registry.match('foo'), 1);
			handle.destroy();
			assert.equal(registry.match('foo'), 2);

			// check that destroying a second time doesn't throw
			handle.destroy();
		}
	},

	'default value'() {
		const registry = new MatchRegistry<any>('foo');
		assert.strictEqual(registry.match('bar'), 'foo');
	}
});
