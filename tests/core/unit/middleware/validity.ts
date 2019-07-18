const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import validityMiddleware from '../../../../src/core/middleware/validity';

const sb = sandbox.create();
const nodeStub = {
	get: sb.stub()
};
const invalidatorStub = sb.stub();

describe('validity middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('should return default value', () => {
		const { callback } = validityMiddleware();
		const validity = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const result = validity.get('root', 'testValue');
		assert.deepEqual(result, { valid: undefined, message: '' });
	});

	it('should return the validity details from node', () => {
		const { callback } = validityMiddleware();
		const validity = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const domNode = {
			validity: { valid: false },
			value: 'testValue',
			validationMessage: 'test validation message'
		};
		nodeStub.get.withArgs('root').returns(domNode);
		const result = validity.get('root', 'testValue');
		assert.deepEqual(result, { valid: false, message: 'test validation message' });
		assert.isTrue(invalidatorStub.notCalled);
	});

	it('should invalidate if the value and domNode do not match', () => {
		const { callback } = validityMiddleware();
		const validity = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const domNode = {
			validity: { valid: false },
			value: 'otherValue',
			validationMessage: 'test validation message'
		};
		nodeStub.get.withArgs('root').returns(domNode);
		const result = validity.get('root', 'testValue');
		assert.deepEqual(result, { valid: false, message: 'test validation message' });
		return new Promise((resolve) => {
			setTimeout(() => {
				assert.isTrue(invalidatorStub.calledOnce);
				resolve();
			}, 10);
		});
	});
});
