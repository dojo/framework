const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import blockMiddleware from '../../../../src/core/middleware/block';
import cacheMiddleware from '../../../../src/core/middleware/cache';

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const deferStub = {
	pause: sb.stub(),
	resume: sb.stub()
};
const { callback } = blockMiddleware();
const cache = cacheMiddleware().callback({ id: 'cache-test', middleware: { destroy: sb.stub() }, properties: {} });

describe('block middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('block', () => {
		const block = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub,
				defer: deferStub
			},
			properties: {}
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

		const resultOne = block.run(testModule)('test');
		assert.isTrue(deferStub.pause.calledOnce);
		const resultTwo = block.run(testModuleOther)('test');
		assert.isTrue(deferStub.pause.calledTwice);
		const resultThree = block.run(testModule)('other');
		assert.isTrue(deferStub.pause.calledThrice);
		assert.isNull(resultOne);
		assert.isNull(resultTwo);
		assert.isNull(resultThree);
		assert.isTrue(deferStub.resume.notCalled);

		resolverOne('resultOne');
		resolverTwo('resultTwo');
		resolverThree('resultThree');
		return Promise.all([promiseOne, promiseTwo, promiseThree]).then(() => {
			assert.isTrue(deferStub.resume.calledThrice);
			assert.isTrue(invalidatorStub.calledThrice);
			const resultOne = block.run(testModule)('test');
			assert.strictEqual(resultOne, 'resultOne');
			const resultTwo = block.run(testModuleOther)('test');
			assert.strictEqual(resultTwo, 'resultTwo');
			const resultThree = block.run(testModule)('other');
			assert.strictEqual(resultThree, 'resultThree');
			assert.isTrue(deferStub.pause.calledThrice);
		});
	});

	it('Should return the result immediately when sync', () => {
		const block = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub,
				defer: deferStub
			},
			properties: {}
		});

		function testModule(a: string) {
			return 'sync';
		}

		let resultOne = block.run(testModule)('test');
		assert.strictEqual(resultOne, 'sync');
		resultOne = block.run(testModule)('test');
		assert.strictEqual(resultOne, 'sync');
	});
});
