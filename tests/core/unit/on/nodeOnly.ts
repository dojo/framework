import common from './common';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import on, { emit } from '../../../src/on';
import * as events from 'events';

function createTarget() {
	return new events.EventEmitter();
}

registerSuite('events - EventEmitter', {
	'common cases': common({
		eventName: 'test',
		createTarget: createTarget
	}),

	'emit return value'() {
		const target = createTarget();
		assert.isFalse(emit(target, { type: 'test' }));

		const handle = on(target, 'test', function() {});
		assert.isFalse(emit(target, { type: 'test' }));

		handle.destroy();
	}
});
