import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Evented from 'src/Evented';

interface CustomEvent {
	type: string;
	value?: string;
	cancelable?: boolean;
	preventDefault?: () => void;
}

registerSuite({
		name: 'Evented',

		'.on and .emit': function () {
			const evented = new Evented();
			let emittedEvent: CustomEvent;
			let listenerCallCount = 0;

			evented.on('test', function (actualEvent: CustomEvent) {
				listenerCallCount++;
				assert.strictEqual(actualEvent.value, emittedEvent.value);
			});

			emittedEvent = { value: 'foo', type: 'test' };
			evented.emit(emittedEvent);
			assert.strictEqual(listenerCallCount, 1);

			emittedEvent = { value: 'bar', type: 'test' };
			evented.emit(emittedEvent);
			assert.strictEqual(listenerCallCount, 2);
		},

		'__on<eventname> methods': function () {
			const evented = new Evented();
			let expectedEvent: CustomEvent;
			let actualEvent: CustomEvent | undefined;

			assert.notProperty(evented, 'ontestevent');
			evented.on('testevent', function (event) {
				actualEvent = event;
			});
			assert.property(evented, '__ontestevent');

			expectedEvent = { value: 'test', type: 'testevent' };
			(<any> evented).__ontestevent(expectedEvent);
			assert.deepEqual(actualEvent, expectedEvent);
		},

		'removing a listener': function () {
			const evented = new Evented();
			let listenerCalled = false;

			const handle = evented.on('test', function () {
				listenerCalled = true;
			});
			handle.destroy();

			evented.emit({ value: 'foo', type: 'test' });
			assert.isFalse(listenerCalled);
		},

		'listener order': function () {
			const evented = new Evented();
			const order: number[] = [];

			(<any> evented).__ontestevent = function () {
				order.push(1);
			};
			evented.on('testevent', function () {
				order.push(2);
			});
			evented.on('testevent', function () {
				order.push(3);
			});

			evented.emit({type: 'testevent'});
			assert.deepEqual(order, [ 1, 2, 3 ]);
		}
	}
);
