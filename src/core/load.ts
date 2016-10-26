import P from 'dojo-shim/Promise';
import global from './global';
import { Require } from 'dojo-interfaces/loader';

declare const require: Require;

declare const define: {
	(...args: any[]): any;
	amd: any;
};

/* tslint:disable-next-line:variable-name */
const Promise: typeof P = 'Promise' in global
	? global.Promise
	: typeof process === 'object' && process.versions && process.versions.node
		? (<any> require('dojo-shim/dist/umd/Promise')).default
		: (<any> require('dojo-shim/Promise')).default;

export interface NodeRequire {
	(moduleId: string): any;
}

export type Require = Require | NodeRequire;

export interface Load {
	(require: Require, ...moduleIds: string[]): P<any[]>;
	(...moduleIds: string[]): P<any[]>;
}

const load: Load = (function (): Load {
	if (typeof module === 'object' && typeof module.exports === 'object') {
		return function (contextualRequire: any, ...moduleIds: string[]): P<any[]> {
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
		return function (contextualRequire: any, ...moduleIds: string[]): P<any[]> {
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
