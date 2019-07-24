import WeakMap from '../shim/WeakMap';
import { WidgetBase } from '../core/WidgetBase';
import { handleDecorator } from '../core/decorators/handleDecorator';
import { beforeProperties } from '../core/decorators/beforeProperties';
import { alwaysRender } from '../core/decorators/alwaysRender';
import { InjectorItem, RegistryLabel, Constructor, DNode } from '../core/interfaces';
import { Store, Path } from './Store';
import { Registry } from '../core/Registry';
import { GetPaths } from './StoreProvider';
import { w } from '../core/vdom';
export { GetPaths } from './StoreProvider';
const registeredInjectorsMap: WeakMap<WidgetBase, InjectorItem<Store>[]> = new WeakMap();

export interface GetProperties<S extends Store, W extends WidgetBase<any, any> = WidgetBase<any, any>> {
	(payload: S, properties: W['properties']): W['properties'];
}

export type StoreContainerPath<
	S,
	P0 extends keyof S = keyof S,
	P1 extends keyof S[P0] = keyof S[P0],
	P2 extends keyof S[P0][P1] = keyof S[P0][P1],
	P3 extends keyof S[P0][P1][P2] = keyof S[P0][P1][P2],
	P4 extends keyof S[P0][P1][P2][P3] = keyof S[P0][P1][P2][P3]
> = [P0] | [P0, P1] | [P0, P1, P2] | [P0, P1, P2, P3] | [P0, P1, P2, P3, P4];

export interface StoreContainerOptions<S, W extends WidgetBase> {
	paths?: GetPaths<S> | StoreContainerPath<S>[];
	getProperties: GetProperties<Store<S>, W>;
}

export interface StoreInjectConfig<S = any> {
	name: RegistryLabel;
	getProperties: GetProperties<Store<S>, any>;
	paths?: StoreContainerPath<S>[] | GetPaths<S>;
}

export type StoreContainer<T extends WidgetBase<any, any>> = Constructor<
	WidgetBase<Partial<T['properties']>, T['children'][0]>
>;

/**
 * Decorator that registers a store injector with a container based on paths when provided
 *
 * @param config Configuration of the store injector
 */
export function storeInject<S>(config: StoreInjectConfig<S>) {
	const { name, paths, getProperties } = config;

	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase & { own: Function }, properties: any) {
			const injectorItem = this.registry.getInjector<Store<S>>(name);
			if (injectorItem) {
				const { injector } = injectorItem;
				const store = injector();
				const registeredInjectors = registeredInjectorsMap.get(this) || [];
				if (registeredInjectors.length === 0) {
					registeredInjectorsMap.set(this, registeredInjectors);
				}
				if (registeredInjectors.indexOf(injectorItem) === -1) {
					if (paths) {
						let invalidatePaths: Path<S, any>[];
						if (typeof paths === 'function') {
							invalidatePaths = paths(store.path);
						} else {
							invalidatePaths = paths.map((path: any) => store.path(path.join('/')));
						}
						const handle = store.onChange(invalidatePaths, () => this.invalidate());
						this.own({
							destroy: () => {
								handle.remove();
							}
						});
					} else {
						this.own(
							store.on('invalidate', () => {
								this.invalidate();
							})
						);
					}
					registeredInjectors.push(injectorItem);
				}
				return getProperties(store, properties);
			}
		})(target);
	});
}

export function StoreContainer<S = any, W extends WidgetBase<any, any> = WidgetBase<any, any>>(
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	{ paths, getProperties }: StoreContainerOptions<S, W>
): StoreContainer<W> {
	@alwaysRender()
	@storeInject({ name, paths, getProperties })
	class WidgetContainer extends WidgetBase<Partial<W['properties']>, W['children'][0]> {
		protected render(): DNode {
			return w(component, this.properties, this.children);
		}
	}
	return WidgetContainer;
}

/**
 * Creates a typed `StoreContainer` for State generic.
 */
export function createStoreContainer<S>() {
	return <W extends WidgetBase<any, any>>(
		component: Constructor<W> | RegistryLabel,
		name: RegistryLabel,
		{ paths, getProperties }: StoreContainerOptions<S, W>
	) => {
		return StoreContainer(component, name, { paths, getProperties });
	};
}

export interface StoreInjectorOptions {
	key?: RegistryLabel;
	registry?: Registry;
}

export function registerStoreInjector<T>(store: Store<T>, options: StoreInjectorOptions = {}) {
	const { key = 'state', registry = new Registry() } = options;

	if (registry.hasInjector(key)) {
		throw new Error(`Store has already been defined for key ${key.toString()}`);
	}
	registry.defineInjector(key, () => {
		return () => store;
	});
	return registry;
}
