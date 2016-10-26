import * as assert from 'intern/chai!assert';
import on, { emit, once, pausable } from '../../../src/on';
import { Handle } from 'dojo-interfaces/core';

let handles: Handle[] = [];
function testOn(...args: any[]) {
	let handle = on.apply(null, arguments);
	handles.push(handle);
	return handle;
}

function cleanUpListeners(): void {
	while (handles.length > 0) {
		const handle = handles.pop();
		if (handle) {
			handle.destroy();
		}
	}
}

interface CustomEvent {
	type: string;
	value?: string;
	cancelable?: boolean;
	preventDefault?: () => void;
}

export default function (args: any) {
	let target: any;
	const testEventName: string = args.eventName;

	return {
		beforeEach() {
			target = args.createTarget();
		},

		afterEach() {
			cleanUpListeners();
			args.destroyTarget && args.destroyTarget(target);
		},

		'on and emit'() {
			let listenerCallCount = 0;
			let emittedEvent: CustomEvent;

			testOn(target, testEventName, function (actualEvent: CustomEvent) {
				listenerCallCount++;
				assert.strictEqual(actualEvent.value, emittedEvent.value);
			});

			emittedEvent = { value: 'foo', type: testEventName };
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			emittedEvent = { value: 'bar', type: testEventName };
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 2);
		},

		'on - multiple event names'() {
			let listenerCallCount = 0;
			let emittedEventType: string;
			let emittedEvent: CustomEvent;

			testOn(target, ['test1', 'test2'], function (actualEvent: CustomEvent) {
				listenerCallCount++;
				if (emittedEventType in actualEvent) {
					assert.strictEqual(actualEvent.type, emittedEventType);
				}
				assert.strictEqual(actualEvent.value, emittedEvent.value);
			});

			emittedEventType = 'test1';
			emittedEvent = { type: emittedEventType, value: 'foo' };
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			emittedEventType = 'test2';
			emittedEvent = { type: emittedEventType, value: 'bar' };
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 2);
		},

		'on - multiple handlers'() {
			const order: any[] = [];
			testOn(target, ['a', 'b'], function (event: CustomEvent) {
				order.push(1 + event.type);
			});
			testOn(target, [ 'a', 'c' ], function (event: CustomEvent) {
				order.push(2 + event.type);
			});
			emit(target, { type: 'a' });
			emit(target, { type: 'b' });
			emit(target, { type: 'c' });
			assert.deepEqual(order, [ '1a', '2a', '1b', '2c' ]);
		},

		'once'() {
			let listenerCallCount = 0;
			let emittedEvent: CustomEvent;

			handles.push(once(target, testEventName, function (actualEvent: CustomEvent) {
				listenerCallCount++;
				assert.strictEqual(actualEvent.value, emittedEvent.value);
			}));

			emittedEvent = { value: 'foo', type: testEventName };

			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);
		},

		'pausable'() {
			let listenerCallCount = 0;
			let emittedEvent: CustomEvent;

			let handle = pausable(target, testEventName, function (actualEvent: CustomEvent) {
				listenerCallCount++;
				assert.strictEqual(actualEvent.value, emittedEvent.value);
			});
			handles.push(handle);

			emittedEvent = { value: 'foo', type: testEventName };

			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			handle.pause();
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			handle.resume();
			emit(target, emittedEvent);
			assert.strictEqual(listenerCallCount, 2);
		}
	};
}
