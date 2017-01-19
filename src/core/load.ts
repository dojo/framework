import { forOf, isIterable, isArrayLike } from '@dojo/shim/iterator';
import Promise from '@dojo/shim/Promise';
import { Require } from '@dojo/interfaces/loader';

declare const require: Require;

declare const define: {
	(...args: any[]): any;
	amd: any;
};

export interface NodeRequire {
	(moduleId: string): any;
}

export type Require = Require | NodeRequire;

export interface Load {
	(require: Require, ...moduleIds: string[]): Promise<any[]>;
	(...moduleIds: string[]): Promise<any[]>;
}

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

const load: Load = (function (): Load {
	const resolver = typeof require.toUrl === 'function' ? require.toUrl :
		typeof (<any> require).resolve === 'function' ? (<any> require).resolve :
		(resourceId: string) => resourceId;

	function pluginLoad(moduleIds: string[], load: Load, loader: (modulesIds: string[]) => Promise<any>) {
		const pluginResourceIds: string[] = [];
		moduleIds = moduleIds.map((id: string, i: number) => {
			const parts = id.split('!');
			pluginResourceIds[i] = parts[1];
			return parts[0];
		});

		return loader(moduleIds).then((modules: any[]) => {
			pluginResourceIds.forEach((resourceId: string, i: number) => {
				if (typeof resourceId === 'string') {
					const module = modules[i];
					const defaultExport = module['default'] || module;

					if (isPlugin(defaultExport)) {
						resourceId = typeof defaultExport.normalize === 'function' ?
							defaultExport.normalize(resourceId, resolver) :
							resolver(resourceId);

						modules[i] = defaultExport.load(resourceId, load);
					}
				}
			});

			return Promise.all(modules);
		});
	}

	if (typeof module === 'object' && typeof module.exports === 'object') {
		return function load(contextualRequire: any, ...moduleIds: string[]): Promise<any[]> {
			if (typeof contextualRequire === 'string') {
				moduleIds.unshift(contextualRequire);
				contextualRequire = require;
			}

			return pluginLoad(moduleIds, load, (moduleIds: string[]) => {
				try {
					return Promise.resolve(moduleIds.map(function (moduleId): any {
						return contextualRequire(moduleId.split('!')[0]);
					}));
				}
				catch (error) {
					return Promise.reject(error);
				}
			});
		};
	}
	else if (typeof define === 'function' && define.amd) {
		return function load(contextualRequire: any, ...moduleIds: string[]): Promise<any[]> {
			if (typeof contextualRequire === 'string') {
				moduleIds.unshift(contextualRequire);
				contextualRequire = require;
			}

			return pluginLoad(moduleIds, load, (moduleIds: string[]) => {
				return new Promise(function (resolve, reject) {
					let errorHandle: { remove: () => void };

					if (typeof contextualRequire.on === 'function') {
						errorHandle = contextualRequire.on('error', (error: Error) => {
							errorHandle.remove();
							reject(error);
						});
					}

					contextualRequire(moduleIds, function (...modules: any[]) {
						errorHandle && errorHandle.remove();
						resolve(modules);
					});
				});
			});
		};
	}
	else {
		return function () {
			return Promise.reject(new Error('Unknown loader'));
		};
	}
})();
export default load;
