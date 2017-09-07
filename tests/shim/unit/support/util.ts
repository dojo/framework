import {
	getValueDescriptor
} from '../../../src/support/util';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('util', {
	'getValueDescriptor()'() {
		assert.deepEqual(getValueDescriptor('foo'), <TypedPropertyDescriptor<string>> {
			value: 'foo',
			enumerable: false,
			writable: true,
			configurable: true
		});
		assert.deepEqual(getValueDescriptor('foo', true), <TypedPropertyDescriptor<string>> {
			value: 'foo',
			enumerable: true,
			writable: true,
			configurable: true
		});

		assert.deepEqual(getValueDescriptor('foo', true, false), <TypedPropertyDescriptor<string>> {
			value: 'foo',
			enumerable: true,
			writable: false,
			configurable: true
		});
		assert.deepEqual(getValueDescriptor('foo', true, false, false), <TypedPropertyDescriptor<string>> {
			value: 'foo',
			enumerable: true,
			writable: false,
			configurable: false
		});
	}
});
