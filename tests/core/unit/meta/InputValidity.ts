const { registerSuite } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { createSandbox, SinonStub } from 'sinon';
import InputValidity from '../../../../src/core/meta/InputValidity';

import NodeHandler from '../../../../src/core/NodeHandler';
import WidgetBase from '../../../../src/core/WidgetBase';

const sandbox = createSandbox();
let bindInstance: WidgetBase;
let invalidateStub: SinonStub;
let nodeHandler: NodeHandler;

registerSuite('meta - InputValidity', {
	async before() {
		bindInstance = new WidgetBase();
	},

	beforeEach() {
		invalidateStub = sandbox.stub();
		nodeHandler = new NodeHandler();
	},

	afterEach() {
		sandbox.restore();
	},

	tests: {
		'returns default values when node is not found'() {
			sandbox.stub(nodeHandler, 'get').returns(undefined);
			const validity = new InputValidity({
				invalidate: invalidateStub,
				nodeHandler,
				bind: bindInstance
			});

			const { message, valid } = validity.get('test', 'testValue');
			assert.strictEqual(message, '');
			assert.isUndefined(valid);
		},

		'returns the validity and message for the element'() {
			sandbox.stub(nodeHandler, 'get').returns({
				validity: { valid: false },
				value: 'testValue',
				validationMessage: 'test validation message'
			});
			const validity = new InputValidity({
				invalidate: invalidateStub,
				nodeHandler,
				bind: bindInstance
			});

			const { message, valid } = validity.get('test', 'testValue');
			assert.strictEqual(message, 'test validation message');
			assert.isFalse(valid);
		},

		async 'calls invalidate if node values do not match'() {
			const nodeHandler = new NodeHandler();
			const nodeStub = sandbox
				.stub(nodeHandler, 'get')
				.withArgs('input')
				.returns({
					validity: { valid: true },
					value: 'test1',
					validationMessage: ''
				});

			const validity = new InputValidity({
				invalidate: invalidateStub,
				nodeHandler,
				bind: bindInstance
			});

			validity.get('input', 'test2');
			return new Promise((resolve) => {
				setTimeout(() => {
					assert.isTrue(invalidateStub.calledOnce);
					nodeStub.reset();
					resolve();
				}, 10);
			});
		}
	}
});
