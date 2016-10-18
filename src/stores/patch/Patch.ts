import { shouldRecurseInto, isEqual } from '../utils';
import Operation, { OperationType, createOperation } from './Operation';
import JsonPointer, { createPointer } from './JsonPointer';
interface Patch<T, U> {
	operations: Operation[];
	apply(target: T): U;
	toString(): String;
}

export default Patch;

export type PatchMapEntry<T, U> = { id: string; patch: Patch<T, U> };

function _diff(from: any, to: any, startingPath?: JsonPointer): Operation[] {
	if (!shouldRecurseInto(from) || !shouldRecurseInto(to)) {
		return [];
	}
	startingPath = startingPath || createPointer();
	const fromKeys = Object.keys(from);
	const toKeys = Object.keys(to);
	const operations: Operation[] = [];

	fromKeys.forEach(function(key) {
		if (!isEqual(from[key], to[key])) {
			if ((key in from) && !(key in to)) {
				operations.push(createOperation(OperationType.Remove, startingPath.push(key)));
			}
			else if (shouldRecurseInto(from[key]) && shouldRecurseInto(to[key])) {
				operations.push(..._diff(from[key], to[key], startingPath.push(key)));
			}
			else {
				operations.push(createOperation(OperationType.Replace, startingPath.push(key), to[key], null, from[key]));
			}
		}
	});

	toKeys.forEach(function(key) {
		if (!(key in from) && (key in to)) {
			operations.push(createOperation(OperationType.Add, startingPath.push(key), to[key]));
		}
	});

	return operations;
}

export function diff<T, U>(from: T, to: U): Patch<T, U> {
	return <Patch<T, U>> createPatch(_diff(from, to));
}

export function createPatch(operations: Operation[]) {
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
