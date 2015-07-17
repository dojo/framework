import Promise from './Promise';

declare var define: {
	(...args: any[]): any;
	amd: any;
};

export interface AMDRequire {
	(moduleIds: string[], callback: (...modules:any[]) => void): void;
}
export interface NodeRequire {
	(moduleId: string): any;
}
export type Require = AMDRequire | NodeRequire;

export interface Load {
	(require: Require, ...moduleIds: string[]): Promise<any[]>;
	(...moduleIds: string[]): Promise<any[]>;
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
			return new Promise(function (resolve) {
				// TODO: Error path once https://github.com/dojo/loader/issues/14 is figured out
				contextualRequire(moduleIds, function (...modules: any[]) {
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
