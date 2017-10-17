const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

import MemoryHistory from '../../../src/history/MemoryHistory';

suite('MemoryHistory', () => {
	test('default initial path is empty', () => {
		assert.equal(new MemoryHistory().current, '');
	});

	test('can create history with initial path', () => {
		assert.equal(new MemoryHistory({ path: '/initial'}).current, '/initial');
	});

	test('does not prefix the path', () => {
		assert.equal(new MemoryHistory().prefix('/foo'), '/foo');
	});

	test('update path', () => {
		const history = new MemoryHistory();
		history.set('/foo');
		assert.equal(history.current, '/foo');
	});

	test('emits change when path is updated', () => {
		const history = new MemoryHistory();
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.set('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not emit change when path is set to the current value', () => {
		const history = new MemoryHistory({ path: '/foo' });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.set('/foo');
		assert.lengthOf(emittedValues, 0);
	});

	test('replace path', () => {
		const history = new MemoryHistory();
		history.replace('/foo');
		assert.equal(history.current, '/foo');
	});

	test('emits change when path is replaced', () => {
		const history = new MemoryHistory();
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.replace('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not emit change when path is replaced with the current value', () => {
		const history = new MemoryHistory({ path: '/foo' });
		let emittedValues: string[] = [];
		history.on('change', ({ value }) => {
			emittedValues.push(value);
		});
		history.replace('/foo');
		assert.lengthOf(emittedValues, 0);
	});
});
