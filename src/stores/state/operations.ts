import { RemovePatchOperation, ReplacePatchOperation, AddPatchOperation, TestPatchOperation, OperationType } from './Patch';
import { Pointer } from './Pointer';

export function add(path: string, value: any): AddPatchOperation {
	return {
		op: OperationType.ADD,
		path: new Pointer(path),
		value
	};
}

export function replace(path: string, value: any): ReplacePatchOperation {
	return {
		op: OperationType.REPLACE,
		path: new Pointer(path),
		value
	};
}

export function remove(path: string): RemovePatchOperation {
	return {
		op: OperationType.REMOVE,
		path: new Pointer(path)
	};
}

export function test(path: string, value: any): TestPatchOperation {
	return {
		op: OperationType.TEST,
		path: new Pointer(path),
		value
	};
}
