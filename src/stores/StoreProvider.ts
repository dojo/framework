import WidgetBase from '../core/WidgetBase';
import { DNode } from '../core/interfaces';
import { Store, StatePaths, Path } from './Store';
import { diffProperty } from '../core/decorators/diffProperty';
import { Handle } from '../core/Destroyable';
import { shallow } from '../core/diff';
import { alwaysRender } from '../core/decorators/alwaysRender';

export interface GetPaths<S = any> {
	(path: StatePaths<S>): Path<S, any>[];
}

export interface StoreProviderProperties<S = any> {
	renderer: (store: Store<S>) => DNode | DNode[];
	stateKey?: string;
	paths?: GetPaths<S>;
}

function mockPath(...paths: string[]): string {
	return paths.join(',');
}

function pathDiff(previousProperty: Function, newProperty: Function) {
	const previousPaths = previousProperty ? previousProperty(mockPath) : [];
	const currentPaths = newProperty ? newProperty(mockPath) : [];
	const result = shallow(previousPaths, currentPaths);
	return {
		changed: result.changed,
		value: newProperty
	};
}

@alwaysRender()
export class StoreProvider<S = any> extends WidgetBase<StoreProviderProperties<S>, never> {
	private _handle: Handle | undefined;

	private _getStore(key: string): Store<S> | undefined {
		const item = this.registry.getInjector<Store<S>>(key);
		if (item) {
			return item.injector();
		}
	}

	private _getProperties() {
		return { stateKey: 'state', ...this.properties };
	}

	@diffProperty('stateKey')
	@diffProperty('paths', pathDiff)
	protected onChange(previousProperties: any, currentProperties: StoreProviderProperties) {
		const { stateKey = 'state', paths } = currentProperties;
		if (this._handle) {
			this._handle.destroy();
			this._handle = undefined;
		}
		const store = this._getStore(stateKey);
		if (store) {
			if (paths) {
				const handle = store.onChange(paths(store.path), () => this.invalidate());
				this._handle = {
					destroy: () => {
						handle.remove();
					}
				};
			} else {
				this._handle = store.on('invalidate', () => {
					this.invalidate();
				});
			}
			this.own(this._handle);
		}
	}

	protected render(): DNode | DNode[] {
		const { stateKey, renderer } = this._getProperties();
		const store = this._getStore(stateKey);
		if (!this._handle) {
			this.onChange({}, this._getProperties());
		}
		if (store) {
			return renderer(store);
		}
	}
}

export default StoreProvider;
