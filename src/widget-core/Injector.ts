import { Evented } from '@dojo/core/Evented';
import { EventObject } from '@dojo/core/interfaces';

export type InjectorEventMap = {
	invalidate: EventObject<'invalidate'>;
};

export class Injector<T = any> extends Evented<InjectorEventMap> {
	private _payload: T;

	constructor(payload: T) {
		super();
		this._payload = payload;
	}

	public get(): T {
		return this._payload;
	}

	public set(payload: T): void {
		this._payload = payload;
		this.emit({ type: 'invalidate' });
	}
}

export default Injector;
