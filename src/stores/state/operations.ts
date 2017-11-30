import { RemovePatchOperation, ReplacePatchOperation, AddPatchOperation, TestPatchOperation, OperationType } from './Patch';
import { Pointer } from './Pointer';
import { Path } from '../Store';

export function add<T = any, U = any>(path: Path<T,  U>, value: U): AddPatchOperation<T, U> {
	return {
		op: OperationType.ADD,
		path: new Pointer(path.path),
		value
	};
}

export function replace<T = any, U = any>(path: Path<T, U>, value: U): ReplacePatchOperation<T, U> {
	return {
		op: OperationType.REPLACE,
		path: new Pointer(path.path),
		value
	};
}

export function remove<T = any, U = any>(path: Path<T, U>): RemovePatchOperation<T, U> {
	return {
		op: OperationType.REMOVE,
		path: new Pointer(path.path)
	};
}

export function test<T = any, U = any>(path: Path<T, U>, value: U): TestPatchOperation<T, U> {
	return {
		op: OperationType.TEST,
		path: new Pointer(path.path),
		value
	};
}
