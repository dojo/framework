import { Observer, PropertyEvent } from './interfaces';
import { is as isIdentical } from '../object';
import { add as hasAdd } from '../has';
import { queueMicroTask } from '../queue';
import Scheduler from '../Scheduler';

hasAdd('object-observe', typeof (<any> Object).observe === 'function');

interface Es7ChangeEvent {
	name: string;
	object: {};
	oldValue: any;
	type: string;
}

class BaseObjectObserver {
	protected _listener: (events: PropertyEvent[]) => any;
	protected _propertyStore: {};
	protected _target: any;

	constructor(kwArgs?: KwArgs) {
		this._listener = kwArgs.listener;
		this._propertyStore = {};
		this._target = kwArgs.target;
	}
}

export interface KwArgs {
	listener: (events: PropertyEvent[]) => any;
	nextTurn?: boolean;
	onlyReportObserved?: boolean;
	target: {};
}

export class Es7Observer extends BaseObjectObserver implements Observer {
	onlyReportObserved: boolean;

	protected _observeHandler: (changes: any[]) => void;

	constructor(kwArgs: KwArgs) {
		super(kwArgs);

		this.onlyReportObserved = ('onlyReportObserved' in kwArgs) ? kwArgs.onlyReportObserved : true;
		this._setObserver();
	}

	destroy(): void {
		let target = this._target;

		(<any> Object).unobserve(target, this._observeHandler);
		this._listener = this._observeHandler = this._propertyStore = this._target = null;
	}

	observeProperty(...properties: string[]): void {
		let store = <any> this._propertyStore;

		properties.forEach(function (property: string): void {
			store[property] = 1;
		});
	}

	removeProperty(...properties: string[]): void {
		let store = this._propertyStore;

		properties.forEach(function (property: string): void {
			// Since the store is just a simple map, using the `delete` operator is not problematic.
			delete (<any> store)[property];
		});
	}

	protected _setObserver(): void {
		let target = this._target;
		let store = this._propertyStore;

		this._observeHandler = function (changes: Es7ChangeEvent[]): void {
			let propertyMap: { [key: string]: number } = {};
			let events: PropertyEvent[] = changes.reduce(function (
				events: PropertyEvent[],
				change: Es7ChangeEvent
			): PropertyEvent[] {
				let property: string = change.name;

				if (!this.onlyReportObserved || (property in store)) {
					if (property in propertyMap) {
						events.splice(propertyMap[property], 1);
					}

					propertyMap[property] = events.length;

					events.push({
						target: target,
						name: property
					});
				}

				return events;
			}.bind(this), []);

			if (events.length) {
				this._listener(events);
			}
		}.bind(this);

		(<any> Object).observe(target, this._observeHandler);
	}
}

function getPropertyDescriptor(target: {}, property: string): PropertyDescriptor {
	let descriptor: PropertyDescriptor;

	if (!(property in target)) {
		return {
			enumerable: true,
			configurable: true,
			writable: true
		};
	}

	do {
		descriptor = Object.getOwnPropertyDescriptor(target, property);
	} while (!descriptor && (target = Object.getPrototypeOf(target)));

	return descriptor;
}

export class Es5Observer extends BaseObjectObserver implements Observer {
	protected static _scheduler: Scheduler;

	nextTurn: boolean;

	protected _boundDispatch: () => void;
	protected _currentlyScheduled: { [key: string]: PropertyEvent };
	protected _descriptors: { [key: string]: PropertyDescriptor };
	protected _scheduler: Scheduler;

	constructor(kwArgs: KwArgs) {
		super(kwArgs);

		if (!(<any> this.constructor)._scheduler) {
			(<any> this.constructor)._scheduler = new Scheduler({ queueFunction: queueMicroTask });
		}

		this.nextTurn = ('nextTurn' in kwArgs) ? kwArgs.nextTurn : true;

		this._descriptors = {};
		this._scheduler = (<any> this.constructor)._scheduler;
		this._boundDispatch = this._dispatch.bind(this);
	}

	destroy(): void {
		let descriptors = this._descriptors;

		Object.keys(descriptors).forEach(this._restore, this);
		this._descriptors = this._listener = this._propertyStore = this._target = null;
	}

	observeProperty(...properties: string[]): void {
		let target = this._target;
		let store = <any> this._propertyStore;
		let self = this;

		properties.forEach(function (property: string): void {
			let descriptor: PropertyDescriptor = getPropertyDescriptor(target, property);

			if (descriptor.writable) {
				let observableDescriptor: PropertyDescriptor = {
					configurable: descriptor ? descriptor.configurable : true,
					enumerable: descriptor ? descriptor.enumerable : true,
					get: function (): any {
						return store[property];
					},
					set: function (value: any): void {
						let previous: any = store[property];

						if (!isIdentical(value, previous)) {
							store[property] = value;

							self._schedule(property);
						}
					}
				};

				store[property] = target[property];
				self._descriptors[property] = descriptor;
				Object.defineProperty(target, property, observableDescriptor);
			}
		});
	}

	removeProperty(...properties: string[]): void {
		let store = this._propertyStore;

		properties.forEach(function (property: string): void {
			this._restore(property);
			// Since the store is just a simple map, using the `delete` operator is not problematic.
			delete (<any> store)[property];
		}, this);
	}

	protected _dispatch() {
		let queue = this._currentlyScheduled;
		let events: PropertyEvent[] = Object.keys(queue).map(function (property: string): PropertyEvent {
			return queue[property];
		});

		this._currentlyScheduled = null;
		this._listener(events);
	}

	protected _restore(property: string): void {
		let target = this._target;
		let store = this._propertyStore;

		Object.defineProperty(target, property, (this._descriptors[property] || {
			configurable: true,
			enumerable: true,
			value: target[property],
			writable: true
		}));

		target[property] = (<any> store)[property];
	}

	protected _schedule(property: string): void {
		let event: PropertyEvent = {
			target: this._target,
			name: property
		};

		if (this.nextTurn) {
			if (!this._currentlyScheduled) {
				this._currentlyScheduled = {};
				this._scheduler.schedule(this._boundDispatch);
			}

			this._currentlyScheduled[property] = event;
		}
		else {
			this._listener([ event ]);
		}
	}
}
