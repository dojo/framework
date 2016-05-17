import compose from 'dojo-compose/compose';
import { emit } from 'dojo-core/on';
import Promise from 'dojo-core/Promise';
import createEvented, { Evented } from 'dojo-widgets/mixins/createEvented';
import { afterEach, beforeEach, suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import { createHashHistory } from '../../../src/history';

suite('createHashHistory', () => {
	// Mask the globals so tests are forced to explicitly reference the
	// correct window.
	/* tslint:disable */
	const location: void = null;
	/* tslint:enable */

	let sandbox: HTMLIFrameElement;
	beforeEach(() => {
		sandbox = document.createElement('iframe');
		sandbox.src = '/tests/support/sandbox.html';
		document.body.appendChild(sandbox);
		return new Promise(resolve => {
			sandbox.addEventListener('load', resolve);
		});
	});

	afterEach(() => {
		document.body.removeChild(sandbox);
		sandbox = null;
	});

	test('initializes current path to current location', () => {
		sandbox.contentWindow.location.hash = '/foo';
		assert.equal(createHashHistory({ window: sandbox.contentWindow }).current, '/foo');
	});

	test('location defers to the global object', () => {
		assert.equal(createHashHistory().current, window.location.hash.slice(1));
	});

	test('update path', () => {
		const history = createHashHistory({ window: sandbox.contentWindow });
		history.set('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.hash, '#/foo');
	});

	test('emits change when path is updated', () => {
		const history = createHashHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.set('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('replace path', () => {
		const history = createHashHistory({ window: sandbox.contentWindow });
		history.replace('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.hash, '#/foo');
	});

	test('emits change when path is replaced', () => {
		const history = createHashHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.replace('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not add a new history entry when path is replaced', () => {
		const { length } = sandbox.contentWindow.history;
		assert.isTrue(length < 49, 'Too many history entries to run this test. Please open a new browser window');

		const history = createHashHistory({ window: sandbox.contentWindow });
		history.replace('/baz');
		assert.equal(sandbox.contentWindow.history.length, length);
	});

	suite('hashchange', () => {
		let window: Window & Evented;

		beforeEach(() => {
			const createFauxWindow = compose(sandbox.contentWindow).mixin(createEvented);
			window = createFauxWindow();
		});

		test('handles hashchange', () => {
			const history = createHashHistory({ window });

			let emittedValue = '';
			history.on('change', ({ value }) => {
				emittedValue = value;
			});

			sandbox.contentWindow.location.hash = '#/foo';
			emit(window, { type: 'hashchange' });

			assert.equal(history.current, '/foo');
			assert.equal(emittedValue, '/foo');
		});

		test('stops listening to hashchange when destroyed', () => {
			const history = createHashHistory({ window });
			assert.equal(history.current, '');

			history.destroy();
			sandbox.contentWindow.location.hash = '#/foo';
			emit(window, { type: 'hashchange' });

			assert.equal(history.current, '');
		});
	});
});

