import { Destroyable } from '../../core/Destroyable';
import Map from '../../shim/Map';
import WeakMap from '../../shim/WeakMap';
import { WidgetMetaProperties, MetaBase } from '../interfaces';
import { incrementBlockCount, decrementBlockCount } from '../vdom';

export class Block extends Destroyable implements MetaBase {
	private _moduleMap = new WeakMap<Function, any>();
	private _invalidate: () => void;

	constructor(properties: WidgetMetaProperties) {
		super();
		this._invalidate = properties.invalidate;
	}

	public run<T extends Function>(module: T): T {
		const decoratedModule: any = (...args: any[]) => {
			const argsString = JSON.stringify(args);
			let valueMap = this._moduleMap.get(module);
			if (valueMap) {
				const cachedValue = valueMap.get(argsString);
				if (cachedValue !== undefined) {
					return cachedValue;
				}
			}
			const result = module(...args);
			if (result && typeof result.then === 'function') {
				incrementBlockCount();
				result.then((result: any) => {
					if (!valueMap) {
						valueMap = new Map();
						this._moduleMap.set(module, valueMap);
					}
					valueMap.set(argsString, result);
					decrementBlockCount();
					this._invalidate();
				});
				return null;
			}
			return result;
		};
		return decoratedModule as T;
	}
}

export default Block;
