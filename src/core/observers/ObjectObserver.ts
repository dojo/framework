import { Observer, PropertyEvent } from './interfaces';
import { is as isIdentical } from '../object';
import has, { add as hasAdd } from '../has';

hasAdd('object-observe', typeof (<any> Object).observe === 'function');

function getPropertyDescriptor(target: {}, property: string): PropertyDescriptor {
	let descriptor: PropertyDescriptor;

	do {
		descriptor = Object.getOwnPropertyDescriptor(target, property);
	} while (!descriptor && (target = Object.getPrototypeOf(target)));

	return descriptor;
}

export default class ObjectObserver implements Observer {
	onlyReportObserved: boolean;
	nextTurn: boolean;

	protected _descriptors: { [key: string]: PropertyDescriptor };
	protected _listener: (events: PropertyEvent[]) => any;
	protected _observeHandler: (changes: any[]) => void;
	protected _propertyStore: {};
	protected _target: any;

	constructor(kwArgs: ObjectObserver.KwArgs) {
		this._target = kwArgs.target;
		this._listener = kwArgs.listener;
		this.onlyReportObserved = 'onlyReportObserved' in kwArgs ? kwArgs.onlyReportObserved : true;

		this._descriptors = {};
		this._propertyStore = {};

		if (has('object-observe')) {
			this._setObserver();
		}
	}

	destroy(): void {
		let target = this._target;
		let descriptors = this._descriptors;

		if (has('object-observe')) {
			if (this._observeHandler) {
				(<any> Object).unobserve(target, this._observeHandler);
			}
		}
		else {
			Object.keys(descriptors).forEach(this._restore, this);
		}

		this._descriptors = this._listener = this._observeHandler = this._propertyStore = this._target = null;
	}

	observeProperty(...properties: string[]): void {
		let target = this._target;
		let store = <any> this._propertyStore;

		if (has('object-observe')) {
			properties.forEach(function (property: string): void {
				store[property] = 1;
			});
		}
		else {
			properties.forEach(function (property: string): void {
				let self = this;
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

								self._listener([{
									target: target,
									name: property
								}]);
							}
						}
					};

					store[property] = target[property];
					this._descriptors[property] = descriptor;
					Object.defineProperty(target, property, observableDescriptor);
				}
			}, this);
		}
	}

	removeProperty(...properties: string[]): void {
		let store = this._propertyStore;

		if (has('object-observe')) {
			properties.forEach(function (property: string): void {
				// Since the store is just a simple map, using the `delete` operator is not problematic.
				delete (<any> store)[property];
			});
		}
		else {
			properties.forEach(function (property: string): void {
				this._restore(property);
				// Since the store is just a simple map, using the `delete` operator is not problematic.
				delete (<any> store)[property];
			}, this);
		}
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

	protected _setObserver(): void {
		let target = this._target;
		let store = this._propertyStore;

		this._observeHandler = function (changes: any[]): void {
			let events: PropertyEvent[] = changes.map(function (change: any): any {
				return {
					target: target,
					name: change.name
				};
			});

			if (this.onlyReportObserved) {
				events = events.filter(function (event: PropertyEvent): boolean {
					return (event.name in store);
				});
			}

			if (events.length) {
				this._listener(events);
			}
		}.bind(this);

		(<any> Object).observe(target, this._observeHandler);
	}
}

module ObjectObserver {
	export interface KwArgs {
		listener: (events: PropertyEvent[]) => any;
		onlyReportObserved?: boolean;
		target: any;
	}
}
