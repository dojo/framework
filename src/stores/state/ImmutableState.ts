import {
	PatchOperation,
	OperationType,
	RemovePatchOperation,
	ReplacePatchOperation,
	TestPatchOperation
} from './Patch';
import { Pointer } from './Pointer';
import { MutableState, Path, State } from '../Store';
import { Map, List } from 'immutable';

function isString(segment?: string): segment is string {
	return typeof segment === 'string';
}

function inverse(operation: PatchOperation, state: Map<any, any>): PatchOperation[] {
	if (operation.op === OperationType.ADD) {
		const op: RemovePatchOperation = {
			op: OperationType.REMOVE,
			path: operation.path
		};
		const test: TestPatchOperation = {
			op: OperationType.TEST,
			path: operation.path,
			value: operation.value
		};
		return [test, op];
	} else if (operation.op === OperationType.REPLACE) {
		const value = state.getIn(operation.path.segments);
		let op: RemovePatchOperation | ReplacePatchOperation;
		if (value === undefined) {
			op = {
				op: OperationType.REMOVE,
				path: operation.path
			};
		} else {
			op = {
				op: OperationType.REPLACE,
				path: operation.path,
				value: state.getIn(operation.path.segments)
			};
		}
		const test: TestPatchOperation = {
			op: OperationType.TEST,
			path: operation.path,
			value: operation.value
		};
		return [test, op];
	} else {
		return [
			{
				op: OperationType.ADD,
				path: operation.path,
				value: state.getIn(operation.path.segments)
			}
		];
	}
}

export class ImmutableState<T = any> implements MutableState<T> {
	private _state = Map();

	/**
	 * Returns the state at a specific pointer path location.
	 */
	public get = <U = any>(path: Path<T, U>): U => {
		return path.value;
	};

	public at = <U = any>(path: Path<T, Array<U>>, index: number): Path<T, U> => {
		const array = this.get(path);
		const value = array && array[index];

		return {
			path: `${path.path}/${index}`,
			state: path.state,
			value
		};
	};

	public path: State<T>['path'] = (path: string | Path<T, any>, ...segments: (string | undefined)[]) => {
		if (typeof path === 'string') {
			segments = [path, ...segments];
		} else {
			segments = [...new Pointer(path.path).segments, ...segments];
		}

		const stringSegments = segments.filter<string>(isString);
		const hasMultipleSegments = stringSegments.length > 1;
		const pointer = new Pointer(hasMultipleSegments ? stringSegments : stringSegments[0] || '');
		let value = this._state.getIn(pointer.segments);

		if (value instanceof List || value instanceof Map) {
			value = value.toJS();
		}

		return {
			path: pointer.path,
			state: this._state as any,
			value
		};
	};

	public apply(operations: PatchOperation<T>[]): PatchOperation<T>[] {
		let undoOperations: PatchOperation<T>[] = [];

		const patchedState = operations.reduce((state, next) => {
			let patchedState;
			switch (next.op) {
				case OperationType.ADD:
					patchedState = this.setIn(next.path.segments, next.value, state, true);
					break;
				case OperationType.REPLACE:
					patchedState = this.setIn(next.path.segments, next.value, state);
					break;
				case OperationType.REMOVE:
					patchedState = state.removeIn(next.path.segments);
					break;
				case OperationType.TEST:
					const current = state.getIn(next.path.segments);
					if (!current === next.value && !(current && current.equals && current.equals(next.value))) {
						const location = next.path.path;
						throw new Error(`Test operation failure at "${location}".`);
					}
					return state;
				default:
					throw new Error('Unknown operation');
			}
			undoOperations = [...inverse(next, state), ...undoOperations];
			return patchedState;
		}, this._state);
		this._state = patchedState;
		return undoOperations;
	}

	private setIn(segments: string[], value: any, state: Map<any, any>, add = false) {
		const updated = this.set(segments, value, state, add);
		if (updated) {
			return updated;
		}

		state = state.withMutations((map) => {
			segments.slice(0, segments.length - 1).forEach((segment, index) => {
				let nextSegment = '';
				if (index + 1 < segments.length) {
					nextSegment = segments[index + 1];
				}
				const value = state.getIn([...segments.slice(0, index), segment]);
				if (!value || !(value instanceof List || value instanceof Map)) {
					if (!isNaN(parseInt(nextSegment, 10))) {
						map = map.setIn([...segments.slice(0, index), segment], List());
					} else {
						map = map.setIn([...segments.slice(0, index), segment], Map());
					}
				}
			});
		});

		return this.set(segments, value, state, add) || state;
	}

	private set(segments: string[], value: any, state: Map<any, any>, add = false) {
		if (typeof value === 'object' && value != null) {
			if (Array.isArray(value)) {
				value = List(value);
			} else {
				value = Map(value);
			}
		}
		segments = segments.slice();
		const allSegments = segments.slice();
		const lastSegment = segments.pop();
		const parent = state.getIn(segments);

		if (parent instanceof List && add) {
			state = state.setIn(segments, parent.insert(lastSegment, value));

			return state;
		} else if (parent instanceof Map || parent instanceof List) {
			state = state.setIn(allSegments, value);

			return state;
		}

		return false;
	}
}
