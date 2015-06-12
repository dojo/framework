import common from './common';
import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import on, { emit } from 'src/on';
import { EventObject } from 'src/interfaces';

function createTarget(): HTMLElement {
	let element = document.createElement('div');
	document.body.appendChild(element);
	return element;
}

function destroyTarget(target: HTMLElement): void {
	target.parentNode.removeChild(target);
}

interface DOMEvent extends EventObject {
	preventDefault: Function;
}

registerSuite({
	name: 'events - EventTarget',

	'common cases': common({
		eventName: 'test',
		createTarget: createTarget,
		destroyTarget: destroyTarget
	}),

	'emit return value'() {
		const target = createTarget();
		assert.isTrue(emit(target, { type: 'test' }));

		const handle = on(target, 'test', function (evt: DOMEvent) {
			evt.preventDefault();
		});

		assert.isTrue(emit(target, { type: 'test', cancelable: false }));
		assert.isFalse(emit(target, { type: 'test', cancelable: true }));

		destroyTarget(target);
		handle.destroy();
	}
});
