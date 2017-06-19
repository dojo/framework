import { Evented } from '@dojo/core/Evented';
import { emit } from '@dojo/core/on';
import Promise from '@dojo/shim/Promise';
import { afterEach, beforeEach, suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import HashHistory from '../../../src/history/HashHistory';

suite('HashHistory', () => {
	// Mask the globals so tests are forced to explicitly reference the
	// correct window.
	/* tslint:disable */
	const location: void = <any> null;
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
		sandbox = <any> null;
	});

	test('initializes current path to current location', () => {
		sandbox.contentWindow.location.hash = '/foo';
		assert.equal(new HashHistory({ window: sandbox.contentWindow }).current, '/foo');
	});

	test('location defers to the global object', () => {
		assert.equal(new HashHistory().current, window.location.hash.slice(1));
	});

	test('prefixes the path with a #', () => {
		assert.equal(new HashHistory().prefix('/foo'), '#/foo');
	});

	test('does not prefixe the path when it already starts with a #', () => {
		assert.equal(new HashHistory().prefix('#/foo'), '#/foo');
	});

	test('update path', () => {
		const history = new HashHistory({ window: sandbox.contentWindow });
		history.set('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.hash, '#/foo');
	});

	test('emits change when path is updated', () => {
		const history = new HashHistory({ window: sandbox.contentWindow });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.set('/foo');

		return new Promise((resolve) => setTimeout(resolve, 500))
			.then(() => {
				assert.lengthOf(emittedValues, 1);
				assert.equal(emittedValues[0], '/foo');
			});
	});

	test('does not emit change if path is set to the current value', () => {
		sandbox.contentWindow.location.hash = '/foo';
		const history = new HashHistory({ window: sandbox.contentWindow });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.set('/foo');
		assert.lengthOf(emittedValues, 0);
	});

	test('replace path', () => {
		const history = new HashHistory({ window: sandbox.contentWindow });
		history.replace('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.hash, '#/foo');
	});

	test('emits change when path is replaced', () => {
		const history = new HashHistory({ window: sandbox.contentWindow });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.replace('/foo');

		return new Promise((resolve) => setTimeout(resolve, 500))
			.then(() => {
				assert.lengthOf(emittedValues, 1);
				assert.equal(emittedValues[0], '/foo');
			});
	});

	test('does not emit change if path is replaced with the current value', () => {
		sandbox.contentWindow.location.hash = '/foo';
		const history = new HashHistory({ window: sandbox.contentWindow });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.replace('/foo');
		assert.lengthOf(emittedValues, 0);
	});

	test('does not add a new history entry when path is replaced', () => {
		const { length } = sandbox.contentWindow.history;
		assert.isTrue(length < 49, 'Too many history entries to run this test. Please open a new browser window');

		const history = new HashHistory({ window: sandbox.contentWindow });
		history.replace('/baz');
		assert.equal(sandbox.contentWindow.history.length, length);
	});

	suite('hashchange', () => {
		let window: Window & Evented;

		beforeEach(() => {
			const { location } = sandbox.contentWindow;
			const createFauxWindow = class extends Evented {
				location = location;
			};
			window = <any> new createFauxWindow();
		});

		test('handles hashchange', () => {
			const history = new HashHistory({ window });

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
			const history = new HashHistory({ window });
			assert.equal(history.current, '');

			history.destroy();
			sandbox.contentWindow.location.hash = '#/foo';
			emit(window, { type: 'hashchange' });

			assert.equal(history.current, '');
		});
	});
});
