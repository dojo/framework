import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import SizeQueue from 'src/streams/SizeQueue';

var queue: SizeQueue<string>;
registerSuite({
	name: 'SizeQueue',

	beforeEach() {
		queue = new SizeQueue<string>();
	},

	'enqueue() and dequeue()'() {
		var str = 'test';
		queue.enqueue(str, str.length);
		assert.lengthOf(queue, 1);
		assert.strictEqual(queue.dequeue(), str);
		assert.lengthOf(queue, 0);
	},

	'totalSize'() {
		var str = 'test';
		var len = 4;
		queue.enqueue(str, len);
		assert.strictEqual(queue.totalSize, len);
		queue.enqueue(str, len);
		assert.strictEqual(queue.totalSize, len * 2);
		queue.enqueue(str, len);
		assert.strictEqual(queue.totalSize, len * 3);
	},

	'empty()'() {
		assert.lengthOf(queue, 0);
		queue.enqueue('test', 4);
		assert.lengthOf(queue, 1);
		queue.empty();
		assert.lengthOf(queue, 0);
	},

	'peek()'() {
		var str = 'test';
		queue.enqueue(str, str.length);
		assert.lengthOf(queue, 1);
		assert.strictEqual(queue.peek(), str);
		assert.lengthOf(queue, 1);
	}
});
