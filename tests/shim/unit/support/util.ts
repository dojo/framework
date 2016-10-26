import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import {
	getValueDescriptor
} from '../../../src/support/util';

registerSuite({
	name: 'util',

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
