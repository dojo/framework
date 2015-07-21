import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import has from 'src/has';
import { PropertyEvent } from 'src/observers/interfaces';
import { Es5Observer, Es7Observer } from 'src/observers/ObjectObserver';

registerSuite({
	name: 'observers/ObjectObserver',

	'Es7Observer': {
		'propertyChanges': function () {
			if (!has('object-observe')) {
				this.skip('Native Object.observe support is required for this test.');
			}

			testPropertyChanges.call(this, Es7Observer);
		},

		'when onlyReportObserved is true': function () {
			if (!has('object-observe')) {
				this.skip('Native Object.observe support is required for this test.');
			}

			const dfd = this.async(5000);
			const object: { a: number; b?: number } = { a: 1 };

			let isCalled: boolean = false;
			const observer = new Es7Observer({
				target: object,
				listener: function (events: PropertyEvent[]): any {
					isCalled = true;
				}
			});

			observer.observeProperty('a');
			object.b = 3;

			setTimeout(dfd.callback(function () {
				assert.isFalse(isCalled);
			}), 100);
		},

		'when onlyReportObserved is false': function () {
			if (!has('object-observe')) {
				this.skip('Native Object.observe support is required for this test.');
			}

			const dfd = this.async(5000);
			const object: { a: number; b?: number } = { a: 1 };

			let b: number;
			new Es7Observer({
				onlyReportObserved: false,
				target: object,
				listener: function (events: PropertyEvent[]): any {
					const target = events[0].target;
					b = (<any> target)[events[0].name];
				}
			});

			object.b = 3;

			setTimeout(dfd.callback(function () {
				assert.equal(b, 3);
			}), 100);
		},

		'.removeProperty()': function () {
			if (!has('object-observe')) {
				this.skip('Native Object.observe support is required for this test.');
			}

			testRemoveProperty.call(this, Es7Observer);
		},

		'.destroy()': function () {
			if (!has('object-observe')) {
				this.skip('Native Object.observe support is required for this test.');
			}

			testDestroy.call(this, Es7Observer);
		}
	},

	'Es5Observer': {
		'propertyChanges': function () {
			testPropertyChanges.call(this, Es5Observer);
		},

		'when attempting to observe an unwritable property': function () {
			const dfd = this.async(5000);
			const object = Object.create(Object.prototype, {
				a: {
					enumerable: false,
					configurable: true,
					writable: false,
					value: 1
				}
			});

			let b: number;
			const observer = new Es5Observer({
				target: object,
				listener: function (events: PropertyEvent[]): any {
					const target = events[0].target;
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
			const dfd = this.async(5000);
			const object: { a: number; b?: number } = { a: 1 };

			let count: number = 0;
			const observer = new Es5Observer({
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
			const dfd = this.async(5000);
			const object: { a: number; b?: number } = { a: 1 };

			let count: number = 0;
			const observer = new Es5Observer({
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

		'.removeProperty()': function () {
			testRemoveProperty.call(this, Es5Observer);
		},

		'.destroy()': function () {
			testDestroy.call(this, Es5Observer);
		}
	}
});

function testPropertyChanges(Ctor: any): void {
	const dfd = this.async(5000);
	const object = Object.create(Object.prototype, {
		a: {
			enumerable: false,
			configurable: true,
			writable: true,
			value: 1
		}
	});

	let b: number;
	let length: number;
	const observer = new Ctor({
		target: object,
		listener: function (events: PropertyEvent[]): any {
			const target = events[0].target;
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
}

function testRemoveProperty(Ctor: any): void {
	const dfd = this.async(5000);
	const mirror: { a: number; b: string } = { a: null, b: null };
	const object: { a: number; b: string } = { a: 1, b: 'Lorem' };
	const observer = new Ctor({
		target: object,
		listener: function (events: PropertyEvent[]): any {
			const target = events[0].target;

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
}

function testDestroy(Ctor: any): void {
	const dfd = this.async(5000);
	const object = { a: 1 };

	let b: number;
	const observer = new Ctor({
		target: object,
		listener: function (events: PropertyEvent[]): any {
			const target = events[0].target;
			b = (<any> target)[events[0].name];
		}
	});

	observer.destroy();
	object.a += 1;
	setTimeout(dfd.callback(function () {
		assert.isUndefined(b);
	}), 100);
}
