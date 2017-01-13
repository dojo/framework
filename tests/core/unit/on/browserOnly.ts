import common from './common';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import on, { emit } from '../../../src/on';
import { EventObject } from '@dojo/interfaces/core';

function createTarget(): HTMLElement {
	let element = document.createElement('div');
	document.body.appendChild(element);
	return element;
}

function destroyTarget(target: HTMLElement): void {
	if (target.parentNode !== null) {
		target.parentNode.removeChild(target);
	}
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
	},

	'emit on window'() {
		const target = window;

		const handle = on(target, 'test', function(evt: DOMEvent) {
			evt.preventDefault();
		});

		assert.isTrue(emit(target, { type: 'test', cancelable: false }));
		assert.isFalse(emit(target, { type: 'test', cancelable: true }));

		handle.destroy();
	},

	'emit on document'() {
		const target = document;

		const handle = on(target, 'test', function(evt: DOMEvent) {
			evt.preventDefault();
		});

		assert.isTrue(emit(target, { type: 'test', cancelable: false }));
		assert.isFalse(emit(target, { type: 'test', cancelable: true }));

		handle.destroy();
	}
});
