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

export function normalizeStrategy<T>({ size, highWaterMark = 1 }: Strategy<T>): Strategy<T> {
	return <Strategy <T>> {
		size: size,
		highWaterMark: highWaterMark > 0 ? highWaterMark : 1
	};
}

/*
Based on sizeof.js by Stephen Morley

A function to calculate the approximate memory usage of objects

Created by Stephen Morley - http://code.stephenmorley.org/ - and released under
the terms of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

Returns the approximate memory usage, in bytes, of the specified object.
*/
export function getApproximateByteSize(object: any): number {
	var objects = [object];
	var size = 0;

	for(let index = 0; index < objects.length; index++) {
		switch (typeof objects[index]) {
			case 'boolean':
				size += 4;
				break;

			case 'number':
				size += 8;
				break;

			case 'string':
				size += 2 * objects[index].length;
				break;

			case 'object':
				// if the object is not an array, add the sizes of the keys
				if (Object.prototype.toString.call(objects[index]) !== '[object Array]') {
					for (let key in objects[index]) {
						size += 2 * key.length;
					}
				}

				// loop over the keys
				for (let key in objects[index]) {
					// determine whether the value has already been processed
					var processed = false;

					for (let j = 0; j < objects.length; j++) {
						if (objects[j] === objects[index][key]){
							processed = true;
							break;
						}
					}

					// queue the value to be processed if appropriate
					if (!processed) {
						objects.push(objects[index][key]);
					}
				}
		}
	}

	return size;
}
