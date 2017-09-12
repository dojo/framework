import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { Injector } from './../../src/Injector';

registerSuite({
	name: 'Injector',
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
