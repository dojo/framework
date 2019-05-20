const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { ImmutableState } from '../../../../src/stores/state/ImmutableState';
import { Pointer } from '../../../../src/stores/state/Pointer';
import { OperationType } from '../../../../src/stores/state/Patch';
import * as ops from './../../../../src/stores/state/operations';

describe('state/ImmutableState', () => {
	describe('add', () => {
		it('value to new path', () => {
			const state = new ImmutableState();
			const result = state.apply([ops.add({ path: 'test', state: null, value: null }, 'test')]);
			assert.equal(state.path('/test').value, 'test');
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to new nested path', () => {
			const state = new ImmutableState();
			const result = state.apply([ops.add({ path: '/foo/bar/qux', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/foo').value, { bar: { qux: 'test' } });
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/foo/bar/qux'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/foo/bar/qux') }
			]);
		});

		it('value to existing path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, true)]);
			const result = state.apply([ops.add({ path: '/test', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/test').value, 'test');
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to array index path', () => {
			const state = new ImmutableState();
			const result = state.apply([ops.add({ path: '/test/0', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/test').value, ['test']);
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test/0'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test/0') }
			]);
		});
	});

	describe('replace', () => {
		it('new path', () => {
			const state = new ImmutableState();
			const result = state.apply([ops.replace({ path: '/test', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/test').value, 'test');
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to new nested path', () => {
			const state = new ImmutableState();
			const result = state.apply([ops.replace({ path: '/foo/bar/qux', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/foo').value, { bar: { qux: 'test' } });
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/foo/bar/qux'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/foo/bar/qux') }
			]);
		});

		it('existing path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, true)]);
			const result = state.apply([ops.replace({ path: '/test', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/test').value, 'test');
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REPLACE, path: new Pointer('/test'), value: true }
			]);
		});

		it('array index path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', value: null, state: null }, ['test', 'foo'])]);
			const result = state.apply([ops.replace({ path: '/test/1', state: null, value: null }, 'test')]);
			assert.deepEqual(state.path('/test').value, ['test', 'test']);
			assert.deepEqual(result, [
				{ op: OperationType.TEST, path: new Pointer('/test/1'), value: 'test' },
				{ op: OperationType.REPLACE, path: new Pointer('/test/1'), value: 'foo' }
			]);
		});
	});

	describe('remove', () => {
		it('new path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/other', state: null, value: null }, true)]);
			const result = state.apply([ops.remove({ path: '/test', state: null, value: null })]);
			assert.deepEqual(state.path('/other').value, true);
			assert.deepEqual(result, [{ op: OperationType.ADD, path: new Pointer('/test'), value: undefined }]);
		});

		it('existing path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, true)]);
			const result = state.apply([ops.remove({ path: '/test', state: null, value: null })]);
			assert.deepEqual(state.path('/test').value, undefined);
			assert.deepEqual(result, [{ op: OperationType.ADD, path: new Pointer('/test'), value: true }]);
		});

		it('array index path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, ['test', 'foo'])]);
			const result = state.apply([ops.remove({ path: '/test/1', state: null, value: null })]);
			assert.deepEqual(state.path('test').value, ['test']);
			assert.deepEqual(result, [{ op: OperationType.ADD, path: new Pointer('/test/1'), value: 'foo' }]);
		});
	});

	describe('test', () => {
		it('success', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, 'test')]);
			const result = state.apply([ops.test({ path: '/test', state: null, value: null }, 'test')]);
			assert.deepEqual(result, []);
			assert.equal(state.path('test').value, 'test');
		});

		function assertTestFailure(initial: any, value: any, errorMessage: string) {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, value)]);
			assert.throws(
				() => {
					state.apply([ops.test({ path: '/test', state: null, value: null }, initial)]);
				},
				Error,
				errorMessage
			);
		}

		it('failure', () => {
			assertTestFailure(
				true,
				'true',
				'Test operation failure at "/test". Expected boolean "true" but got string "true" instead.'
			);
			assertTestFailure(
				{},
				[],
				'Test operation failure at "/test". Expected object "[object Object]" but got array "" instead.'
			);
		});

		it('nested path failure', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/foo/0/bar/baz', state: null, value: null }, { thing: 'two' })]);
			assert.throws(
				() => {
					state.apply([ops.test({ path: '/foo/0/bar/baz', state: null, value: null }, { thing: 'one' })]);
				},
				Error,
				'Test operation failure at "/foo/0/bar/baz". Expected "one" for object property thing but got "two" instead.'
			);
		});

		it('nested path', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/foo/0/bar/baz/0/qux', state: null, value: null }, true)]);
			const result = state.apply([ops.test({ path: '/foo/0/bar/baz/0/qux', state: null, value: null }, true)]);
			assert.deepEqual(result, []);
			assert.deepEqual(state.path('/foo').value, [{ bar: { baz: [{ qux: true }] } }]);
		});

		it('complex value', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/foo/0/bar/baz/0/qux', state: null, value: null }, true)]);
			const result = state.apply([
				ops.test({ path: '/foo', state: null, value: null }, [
					{
						bar: {
							baz: [
								{
									qux: true
								}
							]
						}
					}
				])
			]);
			assert.deepEqual(result, []);
			assert.deepEqual(state.path('/foo').value, [
				{
					bar: {
						baz: [
							{
								qux: true
							}
						]
					}
				}
			]);
		});

		it('no value', () => {
			const state = new ImmutableState();
			state.apply([ops.add({ path: '/test', state: null, value: null }, 'test')]);

			const result = state.apply([ops.test({ path: '/test', state: null, value: null }, 'test')]);
			assert.deepEqual(result, []);
			assert.equal(state.path('/test').value, 'test');
		});
	});

	it('should report the length of an array', () => {
		const state = new ImmutableState();
		state.apply([{ op: OperationType.ADD, path: new Pointer('foo'), value: [] }]);

		assert.equal(state.get(state.path('foo', 'length')), 0);

		state.apply([{ op: OperationType.ADD, path: new Pointer('foo/0'), value: 'foo' }]);

		assert.equal(state.get(state.path('foo', 'length')), 1);
	});

	it('unknown', () => {
		assert.throws(
			() => {
				new ImmutableState().apply([{} as any]);
			},
			Error,
			'Unknown operation'
		);
	});
});
