import { Evented } from '@dojo/core/Evented';

export class Injector<T = any> extends Evented {

	private _payload: T;

	constructor(payload: T) {
		super({});
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
