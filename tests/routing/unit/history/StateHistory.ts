const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub, SinonStub } from 'sinon';

import { StateHistory } from '../../../../src/routing/history/StateHistory';
import { add } from '../../../../src/core/has';

const onChange = stub();
let consoleWarnStub: SinonStub;

describe('StateHistory', () => {
	let sandbox: HTMLIFrameElement;
	beforeEach(() => {
		sandbox = document.createElement('iframe');
		sandbox.src = '../../tests/routing/support/sandbox.html';
		document.body.appendChild(sandbox);
		consoleWarnStub = stub(console, 'warn');
		return new Promise((resolve) => {
			sandbox.addEventListener('load', function() {
				resolve();
			});
		});
	});

	afterEach(() => {
		document.body.removeChild(sandbox);
		sandbox = null as any;
		onChange.reset();
		add('app-base', undefined, true);
		add('dojo-debug', false, true);
		consoleWarnStub.restore();
	});

	it('initializes current path to current location', () => {
		sandbox.contentWindow!.history.pushState({}, '', '/foo?bar');
		assert.equal(new StateHistory({ onChange, window: sandbox.contentWindow! }).current, 'foo?bar');
	});

	it('location defers to the global object', () => {
		assert.equal(new StateHistory({ onChange }).current, window.location.pathname + window.location.search);
	});

	it('prefixes sanatizes path removing / and # characters', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		assert.equal(history.prefix('#/foo'), 'foo');
		assert.equal(history.prefix('#foo'), 'foo');
		assert.equal(history.prefix('/foo'), 'foo');
	});

	it('update path', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('/foo');
		assert.equal(history.current, 'foo');
		assert.equal(sandbox.contentWindow!.location.pathname, '/foo');
	});

	it('update path, does not update path if path is set to the current value', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		const beforeLength = sandbox.contentWindow!.history.length;
		history.set('bar');
		history.set('bar');
		const afterLength = sandbox.contentWindow!.history.length;
		assert.equal(afterLength - beforeLength, 1);
	});

	it('update path, adds leading slash if necessary', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('foo');
		assert.equal(history.current, 'foo');
		assert.equal(sandbox.contentWindow!.location.pathname, '/foo');
	});

	it('emits change when path is updated', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		assert.deepEqual(onChange.firstCall.args, [
			sandbox.contentWindow!.location.pathname.slice(1) + sandbox.contentWindow!.location.search
		]);
		history.set('/foo');
		assert.deepEqual(onChange.secondCall.args, ['foo']);
	});

	it('does not emit change if path is set to the current value', () => {
		sandbox.contentWindow!.history.pushState({}, '', '/foo');
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('/foo');
		assert.isTrue(onChange.calledOnce);
	});

	describe('with base', () => {
		it('throws if base contains #', () => {
			add('app-base', '/foo#bar', true);
			assert.throws(
				() => {
					new StateHistory({ onChange, window });
				},
				TypeError,
				"base must not contain '#' or '?'"
			);
		});

		it('throws if base contains ?', () => {
			add('app-base', '/foo?bar', true);
			assert.throws(
				() => {
					new StateHistory({ onChange, window });
				},
				TypeError,
				"base must not contain '#' or '?'"
			);
		});

		it('initializes current path, taking out the base, with trailing slash', () => {
			add('app-base', '/foo/', true);
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(new StateHistory({ onChange, window: sandbox.contentWindow! }).current, 'bar?baz');
		});

		it('initializes current path, taking out the base, without trailing slash', () => {
			add('app-base', '/foo/', true);
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(new StateHistory({ onChange, window: sandbox.contentWindow! }).current, 'bar?baz');
		});

		it('#set expands the path with the base when pushing state, with trailing slash', () => {
			add('app-base', '/foo/', true);
			const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
			history.set('/foo/bar');
			assert.equal(history.current, 'bar');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/bar');

			history.set('/foo/baz');
			assert.equal(history.current, 'baz');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/baz');
		});

		it('#set expands the path with the base when pushing state, without trailing slash', () => {
			add('app-base', '/foo/', true);
			const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
			history.set('bar');
			assert.equal(history.current, 'bar');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/bar');

			history.set('baz');
			assert.equal(history.current, 'baz');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/baz');
		});

		it('use app base for the base of the state history', () => {
			add('app-base', '/foo/bar/', true);
			sandbox.contentWindow!.history.pushState({}, '', '/');
			const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
			history.set('baz');
			assert.strictEqual(sandbox.contentWindow!.location.pathname, '/foo/bar/baz');
			assert.equal(history.current, 'baz');
		});

		it('add a prefix and suffix slash to base', () => {
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar/');
			add('app-base', 'foo/bar', true);
			const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
			assert.strictEqual(sandbox.contentWindow!.location.pathname, '/foo/bar/');
			history.set('baz');
			assert.strictEqual(sandbox.contentWindow!.location.pathname, '/foo/bar/baz');
			assert.equal(history.current, 'baz');
		});

		it('Warns in debug mode if the base option has been set on history options', () => {
			add('dojo-debug', true, true);
			new StateHistory({ onChange, base: '/foo/', window: sandbox.contentWindow! });
			assert.isTrue(consoleWarnStub.calledOnce);
		});

		it('Does not warn when not in debug mode if the base option has been set on history options', () => {
			new StateHistory({ onChange, base: '/foo/', window: sandbox.contentWindow! });
			assert.isTrue(consoleWarnStub.notCalled);
		});
	});
});
