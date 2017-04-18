import JsonPointer from './JsonPointer';
import { isEqual } from '../utils';

export const enum OperationType {
	Add,
	Remove,
	Replace,
	Copy,
	Move,
	Test
}

export interface Operation {
	op: string;
	path: JsonPointer;
	apply(target: any): any;
	toString(): string;
}

export interface Add extends Operation {
	value: any;
}

function navigatePath(target: any, path: JsonPointer) {
	let currentPath = '';
	let lastSegment = '';
	const pathSegments = path.segments;
	pathSegments.forEach(
		(segment, index) => {
			currentPath += `/${segment}`;
			if (!target) {
				throw new Error(`Invalid path: ${currentPath} doesn't exist in target`);
			}
			else if (index + 1 < pathSegments.length) {
				target = target[segment];
			}
			else {
				lastSegment = segment;
			}
		}
	);

	return {
		object: target,
		property: lastSegment
	};
}

function add(this: Add, target: any) {
	const applyTo = navigatePath(target, this.path);
	applyTo.object[applyTo.property] = this.value;

	return target;
}

function remove(this: Remove, target: any) {
	const applyTo = navigatePath(target, this.path);
	delete applyTo.object[applyTo.property];

	return target;
}

function replace(this: Replace, target: any) {
	const applyTo = navigatePath(target, this.path);
	if (!(applyTo.property in applyTo.object)) {
		throw new Error(`Cannot replace undefined path: ${this.path.toString()} on object`);
	}
	applyTo.object[applyTo.property] = this.value;

	return target;
}

function copyOrMove(from: JsonPointer, to: JsonPointer, target: any, toDelete: boolean) {
	const moveFrom = navigatePath(target, from);
	if (!(moveFrom.property in moveFrom.object)) {
		throw new Error(`Cannot move from undefined path: ${from.toString()} on object`);
	}

	const applyTo = navigatePath(target, to);

	applyTo.object[applyTo.property] = moveFrom.object[moveFrom.property];
	if (toDelete) {
		delete moveFrom.object[moveFrom.property];
	}

}

function move(this: Move, target: any) {
	copyOrMove(this.from, this.path, target, true);
	return target;
}

function copy(this: Copy, target: any) {
	copyOrMove(this.from, this.path, target, false);
	return target;
}

function test(this: Test, target: any) {
	const applyTo = navigatePath(target, this.path);
	return isEqual(applyTo.object[applyTo.property], this.value);
}

export interface Remove extends Operation {}

export interface Replace extends Operation {
	oldValue: any;
	value: any;
}

export interface Move extends Operation {
	from: JsonPointer;
}

export interface Copy extends Operation {
	from: JsonPointer;
}

export interface Test extends Operation {
	value: any;
}

function getPath(path: JsonPointer | string[]) {
	if (Array.isArray(path)) {
		return new JsonPointer(...path);
	}
	else {
		return path;
	}
}

function toString(this: Operation & { value?: any, from?: any } ) {
	let jsonObj: any = {};
	jsonObj.op = this.op;
	jsonObj.path = this.path.toString();
	if (this.value) {
		jsonObj.value = this.value;
	}
	if (this.from) {
		jsonObj.from = this.from.toString();
	}

	return JSON.stringify(jsonObj);
}
function createOperation(type: OperationType.Add, path: JsonPointer | string[], from?: JsonPointer | string[], value?: any, oldValue?: any): Add;
function createOperation(type: OperationType.Remove, path: JsonPointer | string[], from?: JsonPointer | string[], value?: any, oldValue?: any): Remove;
function createOperation(type: OperationType.Replace, path: JsonPointer | string[], from?: JsonPointer | string[], value?: any, oldValue?: any): Replace;
function createOperation(type: OperationType.Test, path: JsonPointer | string[], from?: JsonPointer | string[], value?: any, oldValue?: any): Test;
function createOperation(type: OperationType.Move, path: JsonPointer | string[], from: JsonPointer | string[], value?: any, oldValue?: any): Move;
function createOperation(type: OperationType.Copy, path: JsonPointer | string[], from: JsonPointer | string[], value?: any, oldValue?: any): Copy;
function createOperation(type: OperationType, path: JsonPointer | string[], from?: JsonPointer | string[], value?: any, oldValue?: any): Operation {
	switch (type) {
		case OperationType.Add:
			return <Add> {
				op: 'add',
				path: getPath(path),
				value: value,
				apply: add,
				toString: toString
			};
		case OperationType.Remove:
			return <Remove> {
				op: 'remove',
				path: getPath(path),
				apply: remove,
				toString: toString
			};
		case OperationType.Replace:
			return <Replace> {
				op: 'replace',
				path: getPath(path),
				value: value,
				oldValue: oldValue,
				apply: replace,
				toString: toString
			};
		case OperationType.Move:
			if (!from) {
				throw new Error('From value is required for Move operations');
			}
			return <Move> {
				op: 'move',
				path: getPath(path),
				from: getPath(from),
				apply: move,
				toString: toString
			};
		case OperationType.Copy:
			if (!from) {
				throw new Error('From value is required in Copy operation');
			}
			return <Copy> {
				op: 'copy',
				path: getPath(path),
				from: getPath(from),
				apply: copy,
				toString: toString
			};
		case OperationType.Test:
			return <Test> {
				op: 'test',
				path: getPath(path),
				value: value,
				apply: test,
				toString: toString
			};
	}
}
export default createOperation;
