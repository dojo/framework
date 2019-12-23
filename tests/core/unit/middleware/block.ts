const { it, describe, beforeEach, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox, SinonStub } from 'sinon';

import blockMiddleware from '../../../../src/core/middleware/block';
import icacheMiddleware from '../../../../src/core/middleware/icache';

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const deferStub = {
	pause: sb.stub(),
	resume: sb.stub()
};
const { callback } = blockMiddleware();
let icache: any;

function waitForCall(calls = 1, stub: SinonStub) {
	return new Promise((res) => stub.onCall(calls - 1).callsFake(res));
}

describe('block middleware', () => {
	beforeEach(() => {
		icache = icacheMiddleware().callback({
			id: 'icache-test',
			middleware: { destroy: sb.stub(), invalidator: invalidatorStub },
			properties: () => ({}),
			children: () => []
		});
	});
	afterEach(() => {
		sb.resetHistory();
	});

	it('block', () => {
		const block = callback({
			id: 'test',
			middleware: {
				icache,
				defer: deferStub
			},
			properties: () => ({}),
			children: () => []
		});

		let resolverOne: any;
		let resolverTwo: any;
		let resolverThree: any;
		const promiseOne = new Promise<string>((resolve) => {
			resolverOne = resolve;
		});
		const promiseTwo = new Promise<string>((resolve) => {
			resolverTwo = resolve;
		});
		const promiseThree = new Promise<string>((resolve) => {
			resolverThree = resolve;
		});
		function testModule(a: string) {
			if (a === 'test') {
				return promiseOne;
			}
			return promiseThree;
		}

		function testModuleOther(a: string) {
			return promiseTwo;
		}

		const waiter = waitForCall(3, invalidatorStub);

		const resultOne = block(testModule)('test');
		assert.isTrue(deferStub.pause.calledOnce);
		const resultTwo = block(testModuleOther)('test');
		assert.isTrue(deferStub.pause.calledTwice);
		const resultThree = block(testModule)('other');
		assert.isTrue(deferStub.pause.calledThrice);
		assert.isNull(resultOne);
		assert.isNull(resultTwo);
		assert.isNull(resultThree);
		assert.isTrue(deferStub.resume.notCalled);
		resolverOne('resultOne');
		resolverTwo('resultTwo');
		resolverThree('resultThree');

		return waiter.then(() => {
			assert.isTrue(deferStub.resume.calledThrice);
			assert.isTrue(invalidatorStub.calledThrice);
			const resultOne = block(testModule)('test');
			assert.strictEqual(resultOne, 'resultOne');
			const resultTwo = block(testModuleOther)('test');
			assert.strictEqual(resultTwo, 'resultTwo');
			const resultThree = block(testModule)('other');
			assert.strictEqual(resultThree, 'resultThree');
			assert.isTrue(deferStub.pause.calledThrice);
		});
	});
});
