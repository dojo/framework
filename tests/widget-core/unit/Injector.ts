const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import { Injector } from './../../src/Injector';

registerSuite('Injector', {
	get() {
		const payload = {};
		const injector = new Injector(payload);
		assert.strictEqual(injector.get(), payload);
	},
	set() {
		let invalidateCalled = false;
		const payload = {};
		const injector = new Injector(payload);
		assert.strictEqual(injector.get(), payload);
		injector.on('invalidate', () => {
			invalidateCalled = true;
		});
		injector.set({});
		assert.isTrue(invalidateCalled);
	}
});
