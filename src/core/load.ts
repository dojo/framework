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
	if (typeof module === 'object' && typeof module.exports === 'object') {
		return function (contextualRequire: any, ...moduleIds: string[]): Promise<any[]> {
			if (typeof contextualRequire === 'string') {
				moduleIds.unshift(contextualRequire);
				contextualRequire = require;
			}
			return new Promise(function (resolve, reject) {
				try {
					resolve(moduleIds.map(function (moduleId): any {
						return contextualRequire(moduleId);
					}));
				}
				catch (error) {
					reject(error);
				}
			});
		};
	}
	else if (typeof define === 'function' && define.amd) {
		return function (contextualRequire: any, ...moduleIds: string[]): Promise<any[]> {
			if (typeof contextualRequire === 'string') {
				moduleIds.unshift(contextualRequire);
				contextualRequire = require;
			}
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
		};
	}
	else {
		return function () {
			return Promise.reject(new Error('Unknown loader'));
		};
	}
})();
export default load;
