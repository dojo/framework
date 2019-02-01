import { Destroyable } from '../../core/Destroyable';
import Map from '../../shim/Map';
import WeakMap from '../../shim/WeakMap';
import { WidgetMetaProperties, MetaBase } from '../interfaces';

export class Block extends Destroyable implements MetaBase {
	private _moduleMap = new WeakMap<Function, any>();
	private _invalidate: () => void;

	constructor(properties: WidgetMetaProperties) {
		super();
		this._invalidate = properties.invalidate;
	}

	public run<T extends Function>(module: T): T {
		const decoratedModule: any = (...args: any[]) => {
			let valueMap = this._moduleMap.get(module);
			if (!valueMap) {
				valueMap = new Map();
				this._moduleMap.set(module, valueMap);
			}
			const argsString = JSON.stringify(args);
			const value = valueMap.get(argsString);
			if (value !== undefined) {
				return value;
			}

			valueMap.set(argsString, null);
			const result = module(...args);
			if (!result) {
				return null;
			}
			if (typeof result.then === 'function') {
				result.then((result: any) => {
					valueMap.set(argsString, result);
					this._invalidate();
				});
				return null;
			} else {
				valueMap.set(argsString, result);
			}
			return result;
		};
		return decoratedModule as T;
	}
}

export default Block;
