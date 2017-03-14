import Promise from '@dojo/shim/Promise';
import { isPlugin, useDefault } from './util';

interface ModuleIdMap {
	[path: string]: { id: number; lazy: boolean };
}

interface BundleLoaderCallback<T> {
	(value: T): void;
}

interface WebpackRequire<T> {
	(id: number): T | BundleLoaderCallback<T>;
}

/**
 * A global map (set by the build) of resolved module paths to webpack-specific module data.
 */
declare const __modules__: ModuleIdMap;

/**
 * The webpack-specific require function, set globally by webpack.
 */
declare const __webpack_require__: WebpackRequire<any>;

/**
 * @private
 * Resolves an absolute path from an absolute base path and relative module ID.
 *
 * @param base
 * The absolute base path.
 *
 * @param mid
 * The relative module ID
 *
 * @return
 * The resolved absolute module path.
 */
function resolveRelative(base: string, mid: string): string {
	const isRelative = mid.match(/^\.+\//);
	let result = base;

	if (isRelative) {
		if (mid.match(/^\.\//)) {
			mid = mid.replace(/\.\//, '');
		}

		const up = mid.match(/\.\.\//g);
		if (up) {
			const chunks = base.split('/');

			if (up.length > chunks.length) {
				throw new Error('Path cannot go beyond root directory.');
			}

			chunks.splice(chunks.length - up.length);
			result = chunks.join('/');
			mid = mid.replace(/\.\.\//g, '');
		}

		mid = result + '/' + mid;
	}

	return mid;
}

/**
 * @private
 * Returns the parent directory for the specified module ID.
 *
 * @param context
 * A function that returns the context module ID.
 *
 * @return
 * The parent directory of the path returned by the context function.
 */
function getBasePath(context: () => string): string {
	return context().split('/').slice(0, -1).join('/');
}

/**
 * A webpack-specific function that replaces `@dojo/core/load` in its builds. In order for a module to be loaded,
 * it must first be included in a webpack chunk, whether that chunk is included in the main build, or lazy-loaded.
 * Note that this module is not intended for direct use, but rather is intended for use by a webpack plugin
 * that sets the module ID map used to translate resolved module paths to webpack module IDs.
 *
 * @param contextRequire
 * An optional function that returns the base path to use when resolving relative module IDs.
 *
 * @param ...mids
 * One or more IDs for modules to load.
 *
 * @return
 * A promise to the loaded module values.
 */
export default function load(contextRequire: () => string, ...mids: string[]): Promise<any[]>;
export default function load(...mids: string[]): Promise<any[]>;
export default function load(...args: any[]): Promise<any[]> {
	const req = __webpack_require__;
	const context = typeof args[0] === 'function' ? args[0] : function () { return ''; };

	const modules = __modules__ || {};
	const base = getBasePath(context);

	const results = args.filter((mid: string | Function) => typeof mid === 'string')
		.map((mid: string) => resolveRelative(base, mid))
		.map((mid: string) => {
			let [ moduleId, pluginResourceId ] = mid.split('!');
			const moduleMeta = modules[mid] || modules[moduleId];

			if (!moduleMeta) {
				return Promise.reject(new Error(`Missing module: ${mid}`));
			}

			if (moduleMeta.lazy) {
				return new Promise((resolve) => req(moduleMeta.id)(resolve));
			}

			const module = req(moduleMeta.id);
			const defaultExport = module['default'] || module;

			if (isPlugin(defaultExport)) {
				pluginResourceId = typeof defaultExport.normalize === 'function' ?
					defaultExport.normalize(pluginResourceId, (mid: string) => resolveRelative(base, mid)) :
					resolveRelative(base, pluginResourceId);

				return Promise.resolve(defaultExport.load(pluginResourceId, <any> load));
			}

			return Promise.resolve(module);
		});

	return Promise.all(results);
}

export { isPlugin, useDefault };
