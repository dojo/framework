import { forOf, isIterable, isArrayLike } from '@dojo/shim/iterator';
import { Load } from '../load';

export interface LoadPlugin<T> {
	/**
	 * An optional method that normmalizes a resource id.
	 *
	 * @param resourceId
	 * The raw resource id.
	 *
	 * @param resolver
	 * A method that can resolve an id to an absolute path. Depending on the environment, this will
	 * usually be either `require.toUrl` or `require.resolve`.
	 */
	normalize?: (resourceId: string, resolver: (resourceId: string) => string) => string;

	/**
	 * A method that loads the specified resource.
	 *
	 * @param resourceId
	 * The id of the resource to load.
	 *
	 * @param load
	 * The `load` method that was used to load and execute the plugin.
	 *
	 * @return
	 * A promise that resolves to the loaded resource.
	 */
	load(resourceId: string, load: Load): Promise<T>;
}

export function isPlugin(value: any): value is LoadPlugin<any> {
	return Boolean(value) && typeof value.load === 'function';
}

export function useDefault(modules: any[]): any[];
export function useDefault(module: any): any;
export function useDefault(modules: any | any[]): any[] | any {
	if (isIterable(modules) || isArrayLike(modules)) {
		let processedModules: any[] = [];

		forOf(modules, (module) => {
			processedModules.push((module.__esModule && module.default) ? module.default : module);
		});

		return processedModules;
	}
	else {
		return (modules.__esModule && modules.default) ? modules.default : modules;
	}
}
