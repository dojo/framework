import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createRange } from '../../../src/query/StoreRange';
import { createData, ItemType } from '../support/createData';

registerSuite({
	name: 'StoreRange',

	'Should return data in the specified range.'() {
		const data = createData();
		assert.deepEqual(createRange<ItemType>(1, 2).apply(data), [ data[1], data[2] ]);
	},
	'Should return no data when count is 0.'() {
		const data = createData();
		assert.lengthOf(createRange<ItemType>(1, 0).apply(data), 0);
	},
	'Should return last item when start from last item index and count is 1.'() {
		const data = createData();
		const lastIndx = data.length - 1;
		assert.deepEqual(createRange<ItemType>(lastIndx, 1).apply(data), [data[lastIndx]]);
	},
	'Should return last item only when start from last item index and count is more than 1.'() {
		const data = createData();
		const lastIndx = data.length - 1;
		assert.deepEqual(createRange<ItemType>(lastIndx, 3).apply(data), [data[lastIndx]]);
	},
	'Should have a toString that describes its properties.'() {
		assert.strictEqual(createRange<ItemType>(1, 2).toString(), 'range(1, 2)');
	}
});
