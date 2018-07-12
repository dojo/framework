const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { Injector } from './../../src/Injector';

registerSuite('Injector', {
	get() {
		const payload = {};
		const injector = new Injector(payload);
		assert.strictEqual(injector.get(), payload);
	},
	set() {
		const payload = {};
		const injector = new Injector(payload);
		const invalidatorStub = stub();
		injector.setInvalidator(invalidatorStub);
		assert.strictEqual(injector.get(), payload);
		injector.set({});
		assert.isTrue(invalidatorStub.calledOnce);
	}
});
