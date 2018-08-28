import { getFriendlyDifferenceMessage, isEqual, isObject } from '../../../../src/stores/state/compare';

const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

describe('state/compare', () => {
	describe('isObject', () => {
		it('is an object', () => {
			assert.isTrue(isObject({}));
		});

		it('is not an object', () => {
			assert.isFalse(isObject(() => {}));
			assert.isFalse(isObject(undefined));
			assert.isFalse(isObject(null));
			assert.isFalse(isObject([]));
			assert.isFalse(isObject('[Object object]'));
			assert.isFalse(isObject(Number.NaN));
		});
	});

	describe('isEqual', () => {
		it('equal arrays', () => {
			assert.isTrue(isEqual([1, 'bar'], [1, 'bar']));
		});

		it('arrays of different lengths', () => {
			assert.isFalse(isEqual([1, 2, 3], [1, 2]));
		});

		it('arrays of different values', () => {
			assert.isFalse(isEqual([1, 2, 3], [3, 2, 1]));
		});

		it('equal objects', () => {
			assert.isTrue(isEqual({ foo: 'bar' }, { foo: 'bar' }));
		});

		it('equal objects w/ nested objects', () => {
			assert.isTrue(
				isEqual(
					{
						foo: { bar: 'baz' }
					},
					{ foo: { bar: 'baz' } }
				)
			);
		});

		it('object missing keys', () => {
			assert.isFalse(isEqual({ foo: 'foo', bar: 'bar', baz: 'baz' }, { foo: 'foo', bar: 'bar' }));
		});

		it('objects with different values', () => {
			assert.isFalse(isEqual({ foo: 'bar' }, { foo: 'potato' }));
		});

		it('nested objects with different values', () => {
			assert.isFalse(isEqual({ foo: { bar: 'baz' } }, { foo: { bar: 'potato' } }));
		});

		it('equal primitives', () => {
			assert.isTrue(isEqual(false, false));
		});

		it('non-equal primitives', () => {
			assert.isFalse(isEqual(true, 'true'));
		});
	});

	describe('getFriendlyDifferenceMessage', () => {
		it('equal arrays', () => {
			const expected = 'Arrays are identical';
			const actual = getFriendlyDifferenceMessage([], []);
			assert.strictEqual(actual, expected);
		});

		it('non-equal arrays', () => {
			const expected = 'Arrays differed at offset 1';
			const actual = getFriendlyDifferenceMessage([0, 1, 2, 3], [0, 2, 2, 2]);
			assert.strictEqual(actual, expected);
		});

		it('arrays of different length', () => {
			const expected = 'Arrays differed at offset 2';
			const actual = getFriendlyDifferenceMessage([0, 1, 2], [0, 1]);
			assert.strictEqual(actual, expected);
		});

		it('equal objects', () => {
			const expected = 'Objects are identical';
			const actual = getFriendlyDifferenceMessage({}, {});
			assert.strictEqual(actual, expected);
		});

		it('non-equal objects', () => {
			const expected = 'Expected "foo" for object property foo but got "bar" instead';
			const actual = getFriendlyDifferenceMessage({ foo: 'foo' }, { foo: 'bar' });
			assert.strictEqual(actual, expected);
		});

		it('non-equal primitives', () => {
			const expected = 'Expected "true" but got "false" instead';
			const actual = getFriendlyDifferenceMessage(true, false);
			assert.strictEqual(actual, expected);
		});

		it('primitive values of different types', () => {
			const expected = 'Expected string "true" but got boolean "true" instead';
			const actual = getFriendlyDifferenceMessage('true', true);
			assert.strictEqual(actual, expected);
		});

		it('equal primitive values', () => {
			const expected = 'Values are identical';
			const actual = getFriendlyDifferenceMessage(true, true);
			assert.strictEqual(actual, expected);
		});
	});
});
