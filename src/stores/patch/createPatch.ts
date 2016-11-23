import { shouldRecurseInto, isEqual } from '../utils';
import createOperation,  { Operation, OperationType } from './createOperation';
import createJsonPointer, { JsonPointer } from './createJsonPointer';
export interface Patch<T, U> {
	operations: Operation[];
	apply(target: T): U;
	toString(): String;
}

export type PatchMapEntry<T, U> = { id: string; patch: Patch<T, U> };

function _diff(to: any, from: any, startingPath?: JsonPointer): Operation[] {
	if (!shouldRecurseInto(from) || !shouldRecurseInto(to)) {
		return [];
	}
	const path = startingPath || createJsonPointer();
	const fromKeys = Object.keys(from);
	const toKeys = Object.keys(to);
	const operations: Operation[] = [];

	fromKeys.forEach(function(key) {
		if (!isEqual(from[key], to[key])) {
			if ((key in from) && !(key in to)) {
				operations.push(createOperation(OperationType.Remove, path.push(key)));
			}
			else if (shouldRecurseInto(from[key]) && shouldRecurseInto(to[key])) {
				operations.push(..._diff(to[key], from[key], path.push(key)));
			}
			else {
				operations.push(createOperation(OperationType.Replace, path.push(key), to[key], undefined, from[key]));
			}
		}
	});

	toKeys.forEach(function(key) {
		if (!(key in from) && (key in to)) {
			operations.push(createOperation(OperationType.Add, path.push(key), to[key]));
		}
	});

	return operations;
}

export function diff<T>(to: T): Patch<any, T>;
export function diff<T, U>(to: U, from: T): Patch<T, U>;
export function diff(to: any, from: any = {}) {
	return createPatch(_diff(to, from));
}

function createPatch(operations: Operation[]) {
	return {
		operations: operations,
		apply(this: Patch<any, any>, target: any) {
			return this.operations.reduce((prev: any, next: Operation) => next.apply(prev), target);
		},
		toString(this: Patch<any, any>) {
			return '[' + this.operations.reduce((prev: string, next: Operation) => {
					if (prev) {
						return prev + ',' + next.toString();
					}
					else {
						return next.toString();
					}
				}, '') + ']';
		}
	};
}
export default createPatch;
