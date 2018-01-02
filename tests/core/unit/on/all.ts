const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import common from './common';
import on, { emit } from '../../../src/on';
import Evented from '../../../src/Evented';

registerSuite('events - Evented', {
	'cannot target non-emitter': function() {
		assert.throws(function() {
			on(<any>{}, 'test', function() {});
		});
	},

	'common cases': common({
		eventName: 'test',
		createTarget: function() {
			return new Evented();
		}
	}),

	'emit return value'() {
		const target = new Evented();
		assert.isFalse(emit(target, { type: 'test' }));

		const handle = on(target, 'test', function() {});
		assert.isFalse(emit(target, { type: 'test' }));

		handle.destroy();
	}
});
