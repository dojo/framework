import global from '../../../../src/shim/global';
const { it, afterEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import focusMiddleware from '../../../../src/core/middleware/focus';
import cacheMiddleware from '../../../../src/core/middleware/cache';
import icacheMiddleware from '../../../../src/core/middleware/icache';

const sb = sandbox.create();
const diffPropertyStub = sb.stub();
const destroyStub = sb.stub();
const nodeStub = {
	get: sb.stub()
};
const invalidatorStub = sb.stub();

function cacheFactory() {
	return cacheMiddleware().callback({ id: 'test-cache', properties: {}, middleware: { destroy: sb.stub() } });
}

function icacheFactory() {
	return icacheMiddleware().callback({
		id: 'test-cache',
		properties: {},
		middleware: { cache: cacheFactory(), invalidator: sb.stub() }
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
				cache: cacheFactory(),
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: {}
		});
		assert.isFalse(focus.shouldFocus());
		focus.focus();
		assert.isTrue(focus.shouldFocus());
	});

	it('`shouldFocus` returns true when focus property returns true', () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				cache: cacheFactory(),
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: {}
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
				cache: cacheFactory(),
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: {}
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
				cache: cacheFactory(),
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: {}
		});
		assert.isFalse(focus.isFocused('root'));
	});

	it('Should return true if the node is the active element', async () => {
		const { callback } = focusMiddleware();
		const focus = callback({
			id: 'test',
			middleware: {
				diffProperty: diffPropertyStub,
				cache: cacheFactory(),
				icache: icacheFactory(),
				destroy: destroyStub,
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: {}
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
