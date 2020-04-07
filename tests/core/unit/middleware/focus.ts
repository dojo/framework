import global from '../../../../src/shim/global';
const { it, afterEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import focusMiddleware, { FocusState } from '../../../../src/core/middleware/focus';
import { createICacheMiddleware } from '../../../../src/core/middleware/icache';

const sb = sandbox.create();
const diffPropertyStub = sb.stub();
const destroyStub = sb.stub();
const nodeStub = {
	get: sb.stub()
};
const invalidatorStub = sb.stub();
const icacheInvalidatorStub = sb.stub();

function icacheFactory<T>() {
	return createICacheMiddleware<T>()().callback({
		id: 'test-cache',
		properties: () => ({}),
		children: () => [],
		middleware: { destroy: sb.stub(), invalidator: icacheInvalidatorStub }
	});
}

describe('focus middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('`shouldFocus` is controlled by calls to `focus`', () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				icache: icacheFactory<FocusState>(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isFalse(focus.shouldFocus());
		assert.isTrue(icacheInvalidatorStub.notCalled);
		focus.focus();
		assert.isTrue(icacheInvalidatorStub.calledTwice);
		assert.isTrue(focus.shouldFocus());
		assert.isTrue(icacheInvalidatorStub.calledTwice);
		assert.isFalse(focus.shouldFocus());
		assert.isTrue(icacheInvalidatorStub.calledTwice);
		focus.focus();
		assert.isTrue(icacheInvalidatorStub.calledThrice);
		assert.isTrue(focus.shouldFocus());
		assert.isTrue(icacheInvalidatorStub.calledThrice);
		assert.isFalse(focus.shouldFocus());
		assert.isTrue(icacheInvalidatorStub.calledThrice);
	});

	it('`shouldFocus` returns true when focus property returns true', () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		diffPropertyStub.getCall(0).callArgWith(1, {}, { focus: () => true });
		assert.isTrue(focus.shouldFocus());
	});

	it('`shouldFocus` returns false when focus property returns false', () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		diffPropertyStub.getCall(0).callArgWith(1, {}, { focus: () => false });
		assert.isFalse(focus.shouldFocus());
	});

	it('Should return false if the node is not available', () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isFalse(focus.isFocused('root'));
	});

	it('Should return true if the node is the active element', async () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const div = global.document.createElement('div');
		const buttonOne = global.document.createElement('button');
		buttonOne.setAttribute('id', 'one');
		const buttonTwo = global.document.createElement('button');
		buttonTwo.setAttribute('id', 'two');
		const buttonThree = global.document.createElement('button');
		buttonThree.setAttribute('id', 'three');
		div.appendChild(buttonOne);
		div.appendChild(buttonTwo);
		div.appendChild(buttonThree);
		global.document.body.appendChild(div);
		const addEventListenerSpy = sb.spy(global.document, 'addEventListener');
		const removeEventListener = sb.spy(global.document, 'removeEventListener');
		nodeStub.get.withArgs('root').returns(buttonOne);
		assert.isFalse(focus.isFocused('root'));
		buttonOne.focus();
		if (global.fakeActiveElement) {
			const activeStub = sb.stub(global, 'fakeActiveElement');
			activeStub
				.onFirstCall()
				.returns(buttonOne)
				.onSecondCall()
				.returns(buttonOne)
				.onThirdCall()
				.returns(buttonTwo)
				.onCall(3)
				.returns(buttonTwo)
				.onCall(4)
				.returns(buttonThree);
		}
		let focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(invalidatorStub.calledOnce);
		assert.isTrue(focus.isFocused('root'));
		assert.isTrue(addEventListenerSpy.calledTwice);
		buttonTwo.focus();
		focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(invalidatorStub.calledTwice);
		assert.isFalse(focus.isFocused('root'));
		assert.isTrue(addEventListenerSpy.calledTwice);
		buttonThree.focus();
		focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(invalidatorStub.calledTwice);
		destroyStub.getCall(0).callArg(0);
		assert.isTrue(removeEventListener.calledTwice);
	});
});
