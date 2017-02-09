import { shouldRecurseInto, isEqual } from '../utils';
import createOperation,  { Operation, OperationType } from './createOperation';
import JsonPointer from './JsonPointer';

export type PatchMapEntry<T, U> = { id: string; patch: Patch<T, U> };

function _diff(to: any, from: any, startingPath?: JsonPointer): Operation[] {
	if (!shouldRecurseInto(from) || !shouldRecurseInto(to)) {
		return [];
	}
	const path = startingPath || new JsonPointer();
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
				operations.push(createOperation(OperationType.Replace, path.push(key), undefined, to[key], from[key]));
			}
		}
	});

	toKeys.forEach(function(key) {
		if (!(key in from) && (key in to)) {
			operations.push(createOperation(OperationType.Add, path.push(key), undefined, to[key]));
		}
	});

	return operations;
}

export function diff<T>(to: T): Patch<any, T>;
export function diff<T, U>(to: U, from: T): Patch<T, U>;
export function diff(to: any, from: any = {}) {
	return new Patch(_diff(to, from));
}

export default class Patch<T, U> {
	operations: Operation[];
	apply(target: T): U {
		return this.operations.reduce((prev: any, next: Operation) => next.apply(prev), target);
	}
	toString() {
		return '[' + this.operations.reduce((prev: string, next: Operation) => {
				if (prev) {
					return prev + ',' + next.toString();
				}
				else {
					return next.toString();
				}
			}, '') + ']';
	}
	constructor(operations: Operation[]) {
		this.operations = operations;
	}
}
