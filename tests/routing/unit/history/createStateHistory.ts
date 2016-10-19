import compose from 'dojo-compose/compose';
import createEvented, { Evented } from 'dojo-compose/mixins/createEvented';
import { emit } from 'dojo-core/on';
import Promise from 'dojo-shim/Promise';
import { afterEach, beforeEach, suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import createStateHistory from '../../../src/history/createStateHistory';

suite('createStateHistory', () => {
	// Mask the globals so tests are forced to explicitly reference the
	// correct window.
	/* tslint:disable */
	const history: void = <any> null;
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
		sandbox.contentWindow.history.pushState({}, '', '/foo?bar');
		assert.equal(createStateHistory({ window: sandbox.contentWindow }).current, '/foo?bar');
	});

	test('location defers to the global object', () => {
		assert.equal(createStateHistory().current, window.location.pathname + window.location.search);
	});

	test('prefixes path with leading slash if necessary', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		assert.equal(history.prefix('/foo'), '/foo');
		assert.equal(history.prefix('foo'), '/foo');
	});

	test('update path', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.set('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('update path, adds leading slash if necessary', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.set('foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('emits change when path is updated', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.set('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not emit change if path is set to the current value', () => {
		sandbox.contentWindow.history.pushState({}, '', '/foo');
		const history = createStateHistory({ window: sandbox.contentWindow });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.set('/foo');
		assert.lengthOf(emittedValues, 0);
	});

	test('replace path', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.replace('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('replace path, adds leading slash if necessary', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.replace('foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('emits change when path is replaced', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.replace('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not emit change if path is replaced with the current value', () => {
		sandbox.contentWindow.history.pushState({}, '', '/foo');
		const history = createStateHistory({ window: sandbox.contentWindow });
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

		const history = createStateHistory({ window: sandbox.contentWindow });
		history.replace('/baz');
		assert.equal(sandbox.contentWindow.history.length, length);
	});

	suite('with base', () => {
		test('throws if base contains #', () => {
			assert.throws(() => {
				createStateHistory({ base: '/foo#bar', window });
			}, TypeError, 'base must not contain \'#\'');
		});

		test('throws if base contains ?', () => {
			assert.throws(() => {
				createStateHistory({ base: '/foo?bar', window });
			}, TypeError, 'base must not contain \'?\'');
		});

		test('initializes current path, taking out the base, with trailing slash', () => {
			sandbox.contentWindow.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(createStateHistory({ base: '/foo/', window: sandbox.contentWindow }).current, '/bar?baz');
		});

		test('initializes current path, taking out the base, without trailing slash', () => {
			sandbox.contentWindow.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(createStateHistory({ base: '/foo', window: sandbox.contentWindow }).current, '/bar?baz');
		});

		test('initializes current path to / if it\'s not a base suffix', () => {
			sandbox.contentWindow.history.pushState({}, '', '/foo/bar?baz');
			assert.equal(createStateHistory({ base: '/thud/', window: sandbox.contentWindow }).current, '/');
		});

		test('#prefix prefixes path with the base (with trailing slash)', () => {
			const history = createStateHistory({ base: '/foo/', window: sandbox.contentWindow });
			assert.equal(history.prefix('/bar'), '/foo/bar');
			assert.equal(history.prefix('bar'), '/foo/bar');
		});

		test('#prefix prefixes path with the base (without trailing slash)', () => {
			const history = createStateHistory({ base: '/foo', window: sandbox.contentWindow });
			assert.equal(history.prefix('/bar'), '/foo/bar');
			assert.equal(history.prefix('bar'), '/foo/bar');
		});

		test('#set expands the path with the base when pushing state, with trailing slash', () => {
			const history = createStateHistory({ base: '/foo/', window: sandbox.contentWindow });
			history.set('/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/bar');

			history.set('baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/baz');
		});

		test('#set expands the path with the base when pushing state, without trailing slash', () => {
			const history = createStateHistory({ base: '/foo', window: sandbox.contentWindow });
			history.set('/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/bar');

			history.set('baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/baz');
		});

		test('#replace expands the path with the base when replacing state, with trailing slash', () => {
			const history = createStateHistory({ base: '/foo/', window: sandbox.contentWindow });
			history.replace('/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/bar');

			history.replace('baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/baz');
		});

		test('#replace expands the path with the base when replacing state, without trailing slash', () => {
			const history = createStateHistory({ base: '/foo', window: sandbox.contentWindow });
			history.replace('/bar');
			assert.equal(history.current, '/bar');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/bar');

			history.replace('baz');
			assert.equal(history.current, '/baz');
			assert.equal(sandbox.contentWindow.location.pathname, '/foo/baz');
		});
	});

	suite('popstate', () => {
		let window: Window & Evented;

		beforeEach(() => {
			const { history, location } = sandbox.contentWindow;
			const createFauxWindow = compose(<Window> { history, location }).mixin(createEvented);
			window = createFauxWindow();
		});

		test('handles popstate', () => {
			const history = createStateHistory({ window });

			let emittedValue = '';
			history.on('change', ({ value }) => {
				emittedValue = value;
			});

			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/foo');
			assert.equal(emittedValue, '/foo');
		});

		test('handles popstate with base, with trailing slash', () => {
			const history = createStateHistory({ base: '/foo/', window });

			let emittedValue = '';
			history.on('change', ({ value }) => {
				emittedValue = value;
			});

			sandbox.contentWindow.history.pushState({}, '', '/foo/bar');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/bar');
			assert.equal(emittedValue, '/bar');

			sandbox.contentWindow.history.pushState({}, '', '/baz');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/');
			assert.equal(emittedValue, '/');
		});

		test('handles popstate with base, without trailing slash', () => {
			const history = createStateHistory({ base: '/foo', window });

			let emittedValue = '';
			history.on('change', ({ value }) => {
				emittedValue = value;
			});

			sandbox.contentWindow.history.pushState({}, '', '/foo/bar');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/bar');
			assert.equal(emittedValue, '/bar');

			sandbox.contentWindow.history.pushState({}, '', '/baz');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/');
			assert.equal(emittedValue, '/');
		});

		test('ignores popstate for the current path', () => {
			const history = createStateHistory({ window });

			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			history.on('change', () => {
				throw new Error('Should not emit change for popstate events for the current path');
			});
			emit(window, { type: 'popstate' });
		});

		test('stops listening to popstate when destroyed', () => {
			const history = createStateHistory({ window });
			assert.equal(history.current, '/tests/support/sandbox.html');

			history.destroy();
			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/tests/support/sandbox.html');
		});
	});
});
