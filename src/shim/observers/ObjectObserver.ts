import { Observer, PropertyEvent } from './interfaces';
import { is as isIdentical } from '../object';
import has from '../has';
import Scheduler from '../Scheduler';

let hasNativeObserve: boolean = has('object-observe');

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

module Native {
	interface ChangeEvent {
		name: string;
		object: {};
		oldValue: any;
		type: string;
	}

	export class Observer extends BaseObjectObserver implements Observer {
		onlyReportObserved: boolean;

		protected _observeHandler: (changes: any[]) => void;

		constructor(kwArgs: KwArgs) {
			super(kwArgs);

			this.onlyReportObserved = 'onlyReportObserved' in kwArgs ? kwArgs.onlyReportObserved : true;
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

			this._observeHandler = function (changes: ChangeEvent[]): void {
				let propertyMap: { [key: string]: number } = {};
				let events: PropertyEvent[] = changes.reduce(function (
					events: PropertyEvent[],
					change: ChangeEvent
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
}

module Shim {
	export function getPropertyDescriptor(target: {}, property: string): PropertyDescriptor {
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

	export class Observer extends BaseObjectObserver implements Observer {
		protected static _scheduler: Scheduler;

		nextTurn: boolean;

		protected _boundDispatch: () => void;
		protected _currentlyScheduled: { [key: string]: PropertyEvent };
		protected _descriptors: { [key: string]: PropertyDescriptor };
		protected _scheduler: Scheduler;

		constructor(kwArgs: KwArgs) {
			super(kwArgs);

			if (!(<any> this.constructor)._scheduler) {
				(<any> this.constructor)._scheduler = new Scheduler({ type: 'micro' });
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
}

export interface KwArgs {
	listener: (events: PropertyEvent[]) => any;
	nextTurn?: boolean;
	onlyReportObserved?: boolean;
	target: {};
}

export default class ObjectObserver implements Observer {
	onlyReportObserved: boolean;

	protected _listener: (events: PropertyEvent[]) => any;

	protected _nextTurn: boolean;
	get nextTurn(): boolean {
		return this._nextTurn;
	}
	set nextTurn(value: boolean) {
		let previous: boolean = this._nextTurn;
		this._nextTurn = value;

		this._reset((value && !previous) || (!value && previous));
	}

	protected _observer: Observer;
	protected _target: {};

	constructor(kwArgs: KwArgs) {
		this._target = kwArgs.target;
		this._listener = kwArgs.listener;
		this.onlyReportObserved = ('onlyReportObserved' in kwArgs) ? kwArgs.onlyReportObserved : true;
		this.nextTurn = ('nextTurn' in kwArgs) ? kwArgs.nextTurn : true;
	}

	destroy(): void {
		this._observer && this._observer.destroy();

		this._observer = this._target = this._listener = null;
	}

	observeProperty(...properties: string[]): void {
		let observer = this._observer;
		observer.observeProperty.apply(observer, properties);
	}

	removeProperty(...properties: string[]): void {
		let observer = this._observer;
		observer.removeProperty.apply(observer, properties);
	}

	protected _reset(force?: boolean): void {
		let reset: boolean = (!this._observer || (force && hasNativeObserve));

		if (!reset) {
			this._observer.nextTurn = this.nextTurn;
		}
		else {
			let Ctor = this.nextTurn && hasNativeObserve ? Native.Observer : Shim.Observer;

			this._observer && this._observer.destroy();
			this._observer = new Ctor({
				listener: this._listener,
				nextTurn: this.nextTurn,
				onlyReportObserved: this.onlyReportObserved,
				target: this._target
			});
		}
	}
}
