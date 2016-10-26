import common from './common';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import on, { emit } from '../../../src/on';
import * as events from 'events';

function createTarget() {
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
