const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import focusMiddleware from '../../../../src/core/middleware/focus';
import cacheMiddleware from '../../../../src/core/middleware/cache';
import icacheMiddleware from '../../../../src/core/middleware/icache';

const sb = sandbox.create();
const diffPropertyStub = sb.stub();

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
				icache: icacheFactory()
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
				icache: icacheFactory()
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
				icache: icacheFactory()
			},
			properties: {}
		});
		diffPropertyStub.getCall(0).callArgWith(1, {}, { focus: () => false });
		assert.isFalse(focus.shouldFocus());
	});
});
