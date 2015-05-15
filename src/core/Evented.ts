import { Handle, EventObject } from './interfaces';
import { createCompositeHandle } from './lang';
import { on } from './aspect';

export default class Evented {
	emit(data: EventObject): void {
		const type = '__on' + data.type;
		const method: Function = (<any> this)[type];
		if (method) {
			return method.call(this, data);
		}
	}

	on(type: string, listener: (event: EventObject) => void): Handle {
		const name = '__on' + type;
		if (!(<any> this)[name]) {
			Object.defineProperty(this, name, {
				configurable: true,
				value: undefined,
				writable: true
			});
		}
		return on(this, '__on' + type, listener);
	}
}
