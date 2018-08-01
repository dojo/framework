const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { Destroyable } from '../../../src/core/Destroyable';
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
		}
	}
});
