const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { Destroyable } from '../../src/Destroyable';
import * as sinon from 'sinon';

registerSuite('Destroyable', {
	'own/destroy handle': {
		handle() {
			const destroy = sinon.spy();
			const destroyable = new Destroyable();
			destroyable.own({ destroy });

			assert.strictEqual(destroy.callCount, 0, 'handle should not be called yet');
			return destroyable.destroy().then(() => {
				assert.strictEqual(destroy.callCount, 1, 'handle should have been called');
				return destroyable.destroy().then(() => {
					assert.strictEqual(destroy.callCount, 1, 'handle should not have been called again');
				});
			});
		},

		'array of handles'() {
			const destroy1 = sinon.spy();
			const destroy2 = sinon.spy();

			const destroyable = new Destroyable();
			destroyable.own([
				{ destroy: destroy1 },
				{ destroy: destroy2 }
			]);

			assert.strictEqual(destroy1.callCount, 0, 'first handle should not be called yet');
			assert.strictEqual(destroy2.callCount, 0, 'second handle should not be called yet');
			return destroyable.destroy().then(() => {
				assert.strictEqual(destroy1.callCount, 1, 'first handle should have been called');
				assert.strictEqual(destroy2.callCount, 1, 'second handle should have been called');
				return destroyable.destroy().then(() => {
					assert.strictEqual(destroy1.callCount, 1, 'first handle should not have been called');
					assert.strictEqual(destroy2.callCount, 1, 'second handle should not have been called');
				});
			});
		}
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
	'own handle destruction': {
		handle() {
			const destroy = sinon.spy();
			const destroyable = new Destroyable();
			const handle = destroyable.own({ destroy });
			assert.strictEqual(destroy.callCount, 0, 'destroy not called yet');
			handle.destroy();
			assert.strictEqual(destroy.callCount, 1, 'handle was destroyed');
			destroyable.destroy();
			assert.strictEqual(destroy.callCount, 1, 'destroy was not called again');
		},
		'array of handles'() {
			const destroy1 = sinon.spy();
			const destroy2 = sinon.spy();
			const destroyable = new Destroyable();
			const handle = destroyable.own([
				{ destroy: destroy1 },
				{ destroy: destroy2 }
			]);
			assert.strictEqual(destroy1.callCount, 0, 'first destroy not called yet');
			assert.strictEqual(destroy2.callCount, 0, 'second destroy not called yet');
			handle.destroy();
			assert.strictEqual(destroy1.callCount, 1, 'first handle was destroyed');
			assert.strictEqual(destroy2.callCount, 1, 'second handle was destroyed');
			destroyable.destroy();
			assert.strictEqual(destroy1.callCount, 1, 'first destroy was not called again');
			assert.strictEqual(destroy2.callCount, 1, 'second destroy was not called again');
		}
	}
});
