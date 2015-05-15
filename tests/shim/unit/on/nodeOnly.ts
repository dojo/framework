import common from './common';
import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import on, { emit } from 'src/on';

function createTarget() {
	const events = require('events');
	return new events.EventEmitter();
}

registerSuite({
	name: 'events - EventEmitter',

	'common cases': common({
		eventName: 'test',
		createTarget: createTarget
	}),

	'emit return value'() {
		const target = createTarget();
		assert.isFalse(emit(target, { type: 'test' }));

		const handle = on(target, 'test', function () {});
		assert.isFalse(emit(target, { type: 'test' }));

		handle.destroy();
	}
});
