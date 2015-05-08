import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import has from 'src/has';
import { PropertyEvent } from 'src/observers/interfaces';
import ObjectObserver from 'src/observers/ObjectObserver'

registerSuite({
	name: 'observers/ObjectObserver',

	'property changes': function () {
		let dfd = this.async(100);
		let b: number;
		let length: number;
		let object = Object.create(Object.prototype, {
			a: {
				enumerable: false,
				configurable: true,
				writable: true,
				value: 1
			}
		});
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;
				b = (<any> target)[events[0].name];
				length = events.length;
			}
		});

		observer.observeProperty('a');

		function test() {
			object.a += 1;
			object.a = 3;
		}

		test();
		setTimeout(dfd.callback(function () {
			assert.equal(b, 3);
			assert.isFalse(Object.getOwnPropertyDescriptor(object, 'a').enumerable);
			assert.equal(length, 1, 'Changes to the same property should be reported only once.');
		}), 100);
	},

	'when attempting to observe an unwritable property': function () {
		if (has('object-observe')) {
			this.skip('This functionality is native to ES6 environments.');
		}

		let dfd = this.async(100);
		let b: number;
		let object = Object.create(Object.prototype, {
			a: {
				enumerable: false,
				configurable: true,
				writable: false,
				value: 1
			}
		});
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;
				b = (<any> target)[events[0].name];
			}
		});

		observer.observeProperty('a');
		object.a += 1;

		setTimeout(dfd.callback(function () {
			assert.isUndefined(b);
		}), 100);
	},

	'when nextTurn is true': function () {
		let dfd = this.async(100);
		let count: number = 0;
		let object: { a: number; b?: number } = { a: 1 };
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				++count;
			}
		});

		observer.observeProperty('a', 'b');
		object.a = object.b = 3;

		setTimeout(dfd.callback(function () {
			assert.equal(count, 1);
		}), 100);
	},

	'when nextTurn is false': function () {
		let dfd = this.async(100);
		let count: number = 0;
		let object: { a: number; b?: number } = { a: 1 };
		let observer = new ObjectObserver({
			nextTurn: false,
			target: object,
			listener: function (events: PropertyEvent[]): any {
				++count;
			}
		});

		observer.observeProperty('a', 'b');
		object.a = object.b = 3;

		setTimeout(dfd.callback(function () {
			assert.equal(count, 2);
		}), 100);
	},

	'when onlyReportObserved is true': function () {
		if (!has('object-observe')) {
			this.skip('This functionality is only available in ES6 environments');
		}

		let dfd = this.async(100);
		let b: number;
		let object: { a: number; b?: number } = { a: 1 };
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;
				b = (<any> target)[events[0].name];
			}
		});

		observer.observeProperty('a');
		object.b = 3;

		setTimeout(dfd.callback(function () {
			assert.isUndefined(b);
		}), 100);
	},

	'when onlyReportObserved is false': function () {
		if (!has('object-observe')) {
			this.skip('This functionality is only available in ES6 environments');
		}

		let dfd = this.async(100);
		let b: number;
		let object: { a: number; b?: number } = { a: 1 };
		new ObjectObserver({
			onlyReportObserved: false,
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;
				b = (<any> target)[events[0].name];
			}
		});

		object.b = 3;

		setTimeout(dfd.callback(function () {
			assert.equal(b, 3);
		}), 100);
	},

	'.removeProperty()': function () {
		let dfd = this.async(100);
		let mirror: { a: number; b: string } = { a: null, b: null };
		let object: { a: number; b: string } = { a: 1, b: 'Lorem' };
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;

				(<any> mirror)[events[0].name] = (<any> target)[events[0].name];
			}
		});

		observer.observeProperty('a', 'b');
		observer.removeProperty('b');
		object.a += 1;
		object.b += ' ipsum';

		setTimeout(dfd.callback(function () {
			assert.equal(mirror.a, object.a);
			assert.notEqual(mirror.b, object.b);
		}), 100);
	},

	'.destroy()': function () {
		let dfd = this.async(100);
		let b: number;
		let object = { a: 1 };
		let observer = new ObjectObserver({
			target: object,
			listener: function (events: PropertyEvent[]): any {
				let target = events[0].target;
				b = (<any> target)[events[0].name];
			}
		});

		observer.destroy();
		object.a += 1;
		setTimeout(dfd.callback(function () {
			assert.isUndefined(b);
		}), 100);
	}
});
