import WeakMap from '@dojo/shim/WeakMap';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';
import { handleDecorator } from '@dojo/widget-core/decorators/handleDecorator';
import { beforeProperties } from '@dojo/widget-core/decorators/beforeProperties';
import { alwaysRender } from '@dojo/widget-core/decorators/alwaysRender';
import { RegistryLabel, Constructor, DNode } from '@dojo/widget-core/interfaces';
import { Store } from './Store';
import { Injector } from '@dojo/widget-core/Injector';

const registeredInjectorsMap: WeakMap<WidgetBase, StoreInjector[]> = new WeakMap();

export interface GetProperties<S extends Store, T = any> {
	(payload: S, properties: T): T;
}

export type StoreContainerPath<
	S,
	P0 extends keyof S = keyof S,
	P1 extends keyof S[P0] = keyof S[P0],
	P2 extends keyof S[P0][P1] = keyof S[P0][P1],
	P3 extends keyof S[P0][P1][P2] = keyof S[P0][P1][P2],
	P4 extends keyof S[P0][P1][P2][P3] = keyof S[P0][P1][P2][P3]
> = [P0] | [P0, P1] | [P0, P1, P2] | [P0, P1, P2, P3] | [P0, P1, P2, P3, P4];

export interface StoreInjectConfig<S = any> {
	name: RegistryLabel;
	getProperties: GetProperties<Store<S>>;
	paths?: StoreContainerPath<S>[];
}

export type StoreContainer<T extends WidgetBase> = Constructor<WidgetBase<Partial<T['properties']>, T['children'][0]>>;

/**
 * Decorator that registers a store injector with a container based on paths when provided
 *
 * @param config Configuration of the store injector
 */
export function storeInject<S>(config: StoreInjectConfig<S>) {
	const { name, paths, getProperties } = config;

	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase & { own: Function }, properties: any) {
			const injector: StoreInjector | null = this.registry.getInjector(name);
			if (injector) {
				const registeredInjectors = registeredInjectorsMap.get(this) || [];
				if (registeredInjectors.length === 0) {
					registeredInjectorsMap.set(this, registeredInjectors);
				}
				if (registeredInjectors.indexOf(injector) === -1) {
					if (paths) {
						const handle = injector.onChange(paths, () => {
							this.invalidate();
						});
						this.own({
							destroy: () => {
								handle.remove();
							}
						});
					} else {
						this.own(
							injector.on('invalidate', () => {
								this.invalidate();
							})
						);
					}
					registeredInjectors.push(injector);
				}
				return getProperties(injector.get(), properties);
			}
		})(target);
	});
}

/**
 * Injector for a store
 */
export class StoreInjector<T = any> extends Injector {
	private _store: Store<T>;

	constructor(payload: Store<T>) {
		super({});
		this._store = payload;
		payload.on('invalidate', () => {
			this.emit({ type: 'invalidate' });
		});
	}

	public onChange = (paths: StoreContainerPath<T>[], callback: () => void) => {
		return this._store.onChange(paths.map((path: any) => this._store.path(path.join('/'))), callback);
	};

	public get() {
		return this._store;
	}
}

/**
 * Creates a typed `StoreContainer` for State generic.
 */
export function createStoreContainer<S>() {
	return function<W extends WidgetBase<any, any>>(
		component: Constructor<W> | RegistryLabel,
		name: RegistryLabel,
		{ paths, getProperties }: { paths?: StoreContainerPath<S>[]; getProperties: GetProperties<Store<S>> }
	): StoreContainer<W> {
		@alwaysRender()
		@storeInject({ name, paths, getProperties })
		class WidgetContainer extends WidgetBase<Partial<W['properties']>, W['children'][0]> {
			protected render(): DNode {
				return w(component, this.properties, this.children);
			}
		}
		return WidgetContainer;
	};
}

/**
 * Exports an untyped `StoreContainer`
 */
export const StoreContainer = createStoreContainer();
