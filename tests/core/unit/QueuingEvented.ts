import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import QueuingEvented from '../../src/QueuingEvented';

interface CustomEvent {
	type: 'test';
	target: any;
	value: number;
}

registerSuite({
		name: 'Evented',

		'events are queued for the first subscriber': function () {
			const evented = new QueuingEvented();
			let listenerCallCount = 0;

			evented.emit({
				type: 'test',
				value: 1
			});

			evented.on('test', function () {
				listenerCallCount++;
			});

			assert.strictEqual(listenerCallCount, 1);
		},

		'events do not get queued over maximum'() {
			const evented = new QueuingEvented();
			evented.maxEvents = 5;
			let expectedValues: number[] = [];

			for (let i = 1; i <= 10; i++) {
				evented.emit({
					type: 'test',
					value: i
				});
			}

			evented.on('test', function (event: CustomEvent) {
				expectedValues.push(event.value);
			});

			assert.deepEqual(expectedValues, [ 6, 7, 8, 9, 10 ]);
		},

		'events work fine if used normally'() {
			const evented = new QueuingEvented();
			let listenerCallCount = 0;

			evented.on('test', function () {
				listenerCallCount++;
			});

			evented.emit({
				type: 'test'
			});

			assert.strictEqual(listenerCallCount, 1);
		},

		'events have glob matching'() {
			const evented = new QueuingEvented();
			let listenerCallCount = 0;

			evented.emit({
				type: 'test'
			});

			evented.on('t*', function () {
				listenerCallCount++;
			});

			assert.strictEqual(listenerCallCount, 1);
		}
	}
);
