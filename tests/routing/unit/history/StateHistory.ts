const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import global from '../../../../src/shim/global';
import { add } from '../../../../src/has/has';
import { StateHistory } from '../../../../src/routing/history/StateHistory';

const onChange = stub();

describe('StateHistory', () => {
	let sandbox: HTMLIFrameElement;
	beforeEach(() => {
		sandbox = document.createElement('iframe');
		sandbox.src = '../../tests/routing/support/sandbox.html';
		document.body.appendChild(sandbox);
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
		add('public-path', undefined, true);
		global.window.__public_path__ = undefined;
	});

	it('initializes current path to current location', () => {
		sandbox.contentWindow!.history.pushState({}, '', '/foo?bar');
		assert.equal(new StateHistory({ onChange, window: sandbox.contentWindow! }).current, '/foo?bar');
	});

	it('location defers to the global object', () => {
		assert.equal(new StateHistory({ onChange }).current, window.location.pathname + window.location.search);
	});

	it('prefixes path with leading slash if necessary', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		assert.equal(history.prefix('/foo'), '/foo');
		assert.equal(history.prefix('foo'), '/foo');
	});

	it('prefixes path removes # characters', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		assert.equal(history.prefix('#/foo'), '/foo');
		assert.equal(history.prefix('#foo'), '/foo');
	});

	it('update path', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow!.location.pathname, '/foo');
	});

	it('update path, does not update path if path is set to the current value', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		const beforeLength = sandbox.contentWindow!.history.length;
		history.set('/bar');
		history.set('/bar');
		const afterLength = sandbox.contentWindow!.history.length;
		assert.equal(afterLength - beforeLength, 1);
	});

	it('update path, adds leading slash if necessary', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow!.location.pathname, '/foo');
	});

	it('emits change when path is updated', () => {
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		assert.deepEqual(onChange.firstCall.args, [
			sandbox.contentWindow!.location.pathname + sandbox.contentWindow!.location.search
		]);
		history.set('/foo');
		assert.deepEqual(onChange.secondCall.args, ['/foo']);
	});

	it('does not emit change if path is set to the current value', () => {
		sandbox.contentWindow!.history.pushState({}, '', '/foo');
		const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
		history.set('/foo');
		assert.isTrue(onChange.calledOnce);
	});

	describe('with base', () => {
		it('throws if base contains #', () => {
			assert.throws(
				() => {
					new StateHistory({ onChange, base: '/foo#bar', window });
				},
				TypeError,
				"base must not contain '#' or '?'"
			);
		});

		it('throws if base contains ?', () => {
			assert.throws(
				() => {
					new StateHistory({ onChange, base: '/foo?bar', window });
				},
				TypeError,
				"base must not contain '#' or '?'"
			);
		});

		it('initializes current path, taking out the base, with trailing slash', () => {
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(
				new StateHistory({ onChange, base: '/foo/', window: sandbox.contentWindow! }).current,
				'/bar?baz'
			);
		});

		it('initializes current path, taking out the base, without trailing slash', () => {
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(
				new StateHistory({ onChange, base: '/foo', window: sandbox.contentWindow! }).current,
				'/bar?baz'
			);
		});

		it("initializes current path to / if it's not a base suffix", () => {
			sandbox.contentWindow!.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(new StateHistory({ onChange, base: '/thud/', window: sandbox.contentWindow! }).current, '/');
		});

		it('#prefix prefixes path with the base (with trailing slash)', () => {
			const history = new StateHistory({ onChange, base: '/foo/', window: sandbox.contentWindow! });
			assert.equal(history.prefix('/bar'), '/foo/bar');
			assert.equal(history.prefix('bar'), '/foo/bar');
		});

		it('#prefix prefixes path with the base (without trailing slash)', () => {
			const history = new StateHistory({ onChange, base: '/foo', window: sandbox.contentWindow! });
			assert.equal(history.prefix('/bar'), '/foo/bar');
			assert.equal(history.prefix('bar'), '/foo/bar');
		});

		it('#set expands the path with the base when pushing state, with trailing slash', () => {
			const history = new StateHistory({ onChange, base: '/foo/', window: sandbox.contentWindow! });
			history.set('/foo/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/bar');

			history.set('/foo/baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/baz');
		});

		it('#set expands the path with the base when pushing state, without trailing slash', () => {
			const history = new StateHistory({ onChange, base: '/foo', window: sandbox.contentWindow! });
			history.set('/foo/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/bar');

			history.set('/foo/baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow!.location.pathname, '/foo/baz');
		});

		it('Assumes base set in window __public_path__ variable if not explicitly set', () => {
			add('public-path', 'base/path', true);
			global.window.__public_path__ = 'base/path';
			const history = new StateHistory({ onChange, window: sandbox.contentWindow! });
			assert.strictEqual(history.prefix('foo'), '/base/path/foo');
		});
	});
});
