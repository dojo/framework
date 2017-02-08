import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Destroyable } from '../../../src/bases/Destroyable';

registerSuite({
	name: 'bases/Destroyable',
	'own/destroy handle'() {
		let count = 0;

		const destroyable = new Destroyable();
		destroyable.own({
			destroy() {
				count++;
			}
		});

		assert.strictEqual(count, 0, 'handle should not be called yet');
		return destroyable.destroy().then(() => {
			assert.strictEqual(count, 1, 'handle should have been called');
			return destroyable.destroy().then(() => {
				assert.strictEqual(count, 1, 'handle should not have been called again');
			});
		});
	},
	'own after destruction throws'() {
		const destroyable = new Destroyable();
		destroyable.own({
			destroy() {}
		});
		return destroyable.destroy().then(() => {
			assert.throws(() => {
				destroyable.own({
					destroy() {}
				});
			}, Error);
		});
	},
	'own handle destruction'() {
		let count = 0;
		const destroyable = new Destroyable();
		const handle = destroyable.own({
			destroy() {
				count++;
			}
		});
		assert.strictEqual(count, 0, 'destroy not called yet');
		handle.destroy();
		assert.strictEqual(count, 1, 'handle was destroyed');
		destroyable.destroy();
		assert.strictEqual(count, 1, 'destroy was not called again');
	}
});
