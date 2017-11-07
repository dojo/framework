import { Pointer, walk, PointerTarget } from './Pointer';

export enum OperationType {
	ADD = 'add',
	REMOVE = 'remove',
	REPLACE = 'replace',
	TEST = 'test'
}

export interface BaseOperation {
	op: OperationType;
	path: Pointer;
}

export interface AddPatchOperation<T = any> extends BaseOperation {
	op: OperationType.ADD;
	value: T;
}

export interface RemovePatchOperation extends BaseOperation {
	op: OperationType.REMOVE;
}

export interface ReplacePatchOperation<T = any> extends BaseOperation {
	op: OperationType.REPLACE;
	value: T;
}

export interface TestPatchOperation<T = any> extends BaseOperation {
	op: OperationType.TEST;
	value: T;
}

export type PatchOperation = AddPatchOperation | RemovePatchOperation | ReplacePatchOperation | TestPatchOperation;

export interface PatchResult {
	object: any;
	undoOperations: PatchOperation[];
}

function add(pointerTarget: PointerTarget, value: any): any {
	if (Array.isArray(pointerTarget.target)) {
		pointerTarget.target.splice(parseInt(pointerTarget.segment, 10), 0, value);
	}
	else {
		pointerTarget.target[pointerTarget.segment] = value;
	}
	return pointerTarget.object;
}

function replace(pointerTarget: PointerTarget, value: any): any {
	if (Array.isArray(pointerTarget.target)) {
		pointerTarget.target.splice(parseInt(pointerTarget.segment, 10), 1, value);
	}
	else {
		pointerTarget.target[pointerTarget.segment] = value;
	}
	return pointerTarget.object;
}

function remove(pointerTarget: PointerTarget): any {
	if (Array.isArray(pointerTarget.target)) {
		pointerTarget.target.splice(parseInt(pointerTarget.segment, 10), 1);
	}
	else {
		delete pointerTarget.target[pointerTarget.segment];
	}
	return pointerTarget.object;
}

function test(pointerTarget: PointerTarget, value: any) {
	return isEqual(pointerTarget.target[pointerTarget.segment], value);
}

export function isObject(value: any): value is Object {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function isEqual(a: any, b: any): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((element: any, i: number) => isEqual(element, b[i]));
	}
	else if (isObject(a) && isObject(b)) {
		const keysForA = Object.keys(a).sort();
		const keysForB = Object.keys(b).sort();
		return isEqual(keysForA, keysForB) && keysForA.every(key => isEqual(a[key], b[key]));
	}
	else {
		return a === b;
	}
}

function inverse(operation: PatchOperation, state: any): any[] {
	if (operation.op === OperationType.ADD) {
		const op = {
			op: OperationType.REMOVE,
			path: operation.path
		};
		const test = {
			op: OperationType.TEST,
			path: operation.path,
			value: operation.value
		};
		return [ test, op ];
	}
	else if (operation.op === OperationType.REPLACE) {
		const op = {
			op: OperationType.REPLACE,
			path: operation.path,
			value: operation.path.get(state)
		};
		const test = {
			op: OperationType.TEST,
			path: operation.path,
			value: operation.value
		};
		return [ test, op ];
	}
	else  {
		return [{
			op: OperationType.ADD,
			path: operation.path,
			value: operation.path.get(state)
		}];
	}
}

export class Patch {
	private _operations: PatchOperation[];

	constructor(operations: PatchOperation | PatchOperation[]) {
		this._operations = Array.isArray(operations) ? operations : [ operations ];
	}

	public apply(object: any): PatchResult {
		let undoOperations: PatchOperation[] = [];
		const patchedObject = this._operations.reduce((patchedObject, next) => {
			let object;
			const pointerTarget = walk(next.path.segments, patchedObject);
			switch (next.op) {
				case OperationType.ADD:
					object = add(pointerTarget, next.value);
					break;
				case OperationType.REPLACE:
					object = replace(pointerTarget, next.value);
					break;
				case OperationType.REMOVE:
					object = remove(pointerTarget);
					break;
				case OperationType.TEST:
					const result = test(pointerTarget, next.value);
					if (!result) {
						throw new Error('Test operation failure. Unable to apply any operations.');
					}
					return patchedObject;
				default:
					throw new Error('Unknown operation');
			}
			undoOperations = [ ...undoOperations, ...inverse(next, patchedObject) ];
			return object;
		}, object);
		return { object: patchedObject, undoOperations };
	}
}
