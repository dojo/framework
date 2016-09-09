import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCancelableEvent from '../../../src/util/createCancelableEvent';

registerSuite({
	name: 'util/createCancelableEvent',
	'create event'() {
		const target = { foo: 'bar' };
		const event = createCancelableEvent({
			type: 'foo',
			target
		});

		assert.strictEqual(event.type, 'foo');
		assert.strictEqual(event.target, target);
		assert.isFunction(event.preventDefault);
		assert.isFalse(event.defaultPrevented);
		assert.isTrue(event.cancelable);
	},
	'cancel event'() {
		const event = createCancelableEvent({
			type: 'foo',
			target: {}
		});

		assert.isFalse(event.defaultPrevented);
		event.preventDefault();
		assert.isTrue(event.defaultPrevented);
	},
	'immutable properties'() {
		const event = createCancelableEvent({
			type: 'foo',
			target: {}
		});
		assert.throws(() => {
			event.target = {};
		});
		// This is a compiler error in TS2.1 (next)
		// assert.throws(() => {
		// 	event.type = 'bar';
		// });
		assert.throws(() => {
			event.cancelable = false;
		});
		assert.throws(() => {
			event.defaultPrevented = true;
		});
		assert.throws(() => {
			event.preventDefault = () => {};
		});
	}
});
