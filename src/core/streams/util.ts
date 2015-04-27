import { Strategy } from './interfaces';
import Promise from '../Promise';

export function promiseInvokeOrFallbackOrNoop(object: any, method1: string, args1: any[], method2: string, args2: any[] = []): Promise<any> {
	var method: Function;

	try {
		method = object[method1];
	}
	catch (error ) {
		return Promise.reject(error);
	}

	if (!method) {
		return promiseInvokeOrNoop(object, method2, args2);
	}

	if (!args1) {
		args1 = [];
	}

	try {
		return Promise.resolve(method.apply(object, args1));
	}
	catch (error) {
		return Promise.reject(error);
	}
}

/**
 * return a promise that resolves the with result of the method call or undefined
 */
export function promiseInvokeOrNoop(O: any, P: string, args: any[] = []): Promise<any> {
	var method: any;

	try {
		method = O[P];
	}
	catch (error) {
		return Promise.reject(error);
	}

	if (!method) {
		return Promise.resolve();
	}

	try {
		return Promise.resolve(method.apply(O, args));
	}
	catch (error) {
		return Promise.reject(error);
	}
}

/**
 * call the method or return undefined
 */
export function invokeOrNoop(O: any, P: string, args: any[] = []): any {
	var method: Function = O[P];
	return method ? method.apply(O, args) : undefined;
}

/**
 *
 */
export function createDataProperty(object: {}, property: string, value: any) {
	Object.defineProperty(object, property, { value: value, writable: true, enumerable: true, configurable: true });
}

export function normalizeStrategy<T>({ size, highwaterMark = 1 }: Strategy<T>): Strategy<T> {
	return <Strategy <T>> {
		size: size,
		highwaterMark: highwaterMark > 0 ? highwaterMark : 1
	};
}
