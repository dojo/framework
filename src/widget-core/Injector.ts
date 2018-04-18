import { Evented } from '@dojo/core/Evented';
import { EventObject } from '@dojo/core/interfaces';

export type InjectorEventMap = {
	invalidate: EventObject<'invalidate'>;
};

export class Injector<T = any> extends Evented<InjectorEventMap> {
	private _payload: T;
	private _invalidator: undefined | (() => void);

	constructor(payload: T) {
		super();
		this._payload = payload;
	}

	public setInvalidator(invalidator: () => void) {
		this._invalidator = invalidator;
	}

	public get(): T {
		return this._payload;
	}

	public set(payload: T): void {
		this._payload = payload;
		if (this._invalidator) {
			this._invalidator();
		}
	}
}

export default Injector;
