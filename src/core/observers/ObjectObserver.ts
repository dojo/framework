import * as observers from './interfaces';

// TODO find a way to import this from `lang`...
function isIdentical(a: any, b: any): boolean {
	return a === b ||
		/* both values are NaN */
		(a !== a && b !== b);
}

function getPropertyDescriptor(target: {}, property: string): PropertyDescriptor {
	var descriptor: PropertyDescriptor;

	do {
		descriptor = Object.getOwnPropertyDescriptor(target, property);
	} while (!descriptor && (target = Object.getPrototypeOf(target)));

	return descriptor;
}

export default class ObjectObserver implements observers.ObjectObserver {
	onlyReportObserved: boolean;
	nextTurn: boolean;

	protected _descriptors: { [key: string]: PropertyDescriptor };
	protected _listener: (events: observers.PropertyEvent[]) => any;
	protected _propertyStore: {};
	protected _target: any;

	constructor(kwArgs?: ObjectObserver.KwArgs) {
		this._target = kwArgs.target;
		this._listener = kwArgs.listener;

		this._descriptors = {};
		this._propertyStore = {};
	}

	destroy(): void {
		var target = this._target;
		var descriptors = this._descriptors;
		var store = <any> this._propertyStore;

		Object.keys(descriptors).forEach(function (property: string): void {
			Object.defineProperty(target, property, (descriptors[property] || {
				configurable: true,
				enumerable: true,
				value: target[property],
				writable: true
			}));

			target[property] = store[property];
		});

		this._descriptors = this._propertyStore = this._target = null;
	}

	observeProperty(...properties: string[]): void {
		var target = this._target;
		var store = <any> this._propertyStore;

		properties.forEach(function (property: string): void {
			var self = this;
			var descriptor: PropertyDescriptor = getPropertyDescriptor(target, property);
			var observableDescriptor: PropertyDescriptor = {
				configurable: descriptor ? descriptor.configurable : true,
				enumerable: descriptor ? descriptor.enumerable : true,
				get: function (): any {
					return store[property];
				},
				set: function (value: any): void {
					var previous: any = store[property];

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
		}, this);
	}
}

module ObjectObserver {
	export interface KwArgs {
		target: any;
		listener: (events: observers.PropertyEvent[]) => any;
	}
}
