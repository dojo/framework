import { suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import { createMemoryHistory } from '../../../src/history';

suite('createMemoryHistory', () => {
	test('default initial path is empty', () => {
		assert.equal(createMemoryHistory().current, '');
	});

	test('can create history with initial path', () => {
		assert.equal(createMemoryHistory({ path: '/initial'}).current, '/initial');
	});

	test('update path', () => {
		const history = createMemoryHistory();
		history.set('/foo');
		assert.equal(history.current, '/foo');
	});

	test('emits change when path is updated', () => {
		const history = createMemoryHistory();
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.set('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('replace path', () => {
		const history = createMemoryHistory();
		history.replace('/foo');
		assert.equal(history.current, '/foo');
	});

	test('emits change when path is replaced', () => {
		const history = createMemoryHistory();
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.replace('/foo');
		assert.equal(emittedValue, '/foo');
	});
});
