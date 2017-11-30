import { Evented } from '@dojo/core/Evented';
import { Patch, PatchOperation } from './state/Patch';
import { Pointer } from './state/Pointer';

/**
 * The "path" to a value of type T on and object of type M. The path string is a JSON Pointer to the location of
 * `value` within `state`.
 *
 */
export interface Path<M, T> {
	path: string;
	state: M;
	value: T;
}

/**
 * An interface that enables typed traversal of an arbitrary type M. `path` and `at` can be used to generate
 * `Path`s that allow access to properties within M via the `get` method. The returned `Path`s can also be passed to the
 * utility methods `add`, `replace`, and `delete` in order to generate typed operations for modifying the state of a store.
 */
export interface State<M> {
	get<S>(path: Path<M, S>): S;
	path<T, P0 extends keyof T>(path: Path<M, T>, a: P0): Path<M, T[P0]>;
	path<T, P0 extends keyof T, P1 extends keyof T[P0]>(path: Path<M, T>, a: P0, b: P1): Path<M, T[P0][P1]>;
	path<
		T,
		P0 extends keyof T,
		P1 extends keyof T[P0],
		P2 extends keyof T[P0][P1]
		>(path: Path<M, T>, a: P0, b: P1, c: P2): Path<M, T[P0][P1][P2]>;
	path<
		T,
		P0 extends keyof T,
		P1 extends keyof T[P0],
		P2 extends keyof T[P0][P1],
		P3 extends keyof T[P0][P1][P2]
		>(path: Path<M, T>, a: P0, b: P1, c: P2, d: P3): Path<M, T[P0][P1][P2][P3]>;
	path<
		T,
		P0 extends keyof T,
		P1 extends keyof T[P0],
		P2 extends keyof T[P0][P1],
		P3 extends keyof T[P0][P1][P2],
		P4 extends keyof T[P0][P1][P2][P3]
		>(path: Path<M, T>, a: P0, b: P1, c: P2, d: P3, e: P4): Path<M, T[P0][P1][P2][P3][P4]>;
	path<P0 extends keyof M>(a: P0): Path<M, M[P0]>;
	path<P0 extends keyof M, P1 extends keyof M[P0]>(a: P0, b: P1): Path<M, M[P0][P1]>;
	path<P0 extends keyof M, P1 extends keyof M[P0], P2 extends keyof M[P0][P1]>(a: P0, b: P1, c: P2): Path<M, M[P0][P1][P2]>;
	path<
		P0 extends keyof M,
		P1 extends keyof M[P0],
		P2 extends keyof M[P0][P1],
		P3 extends keyof M[P0][P1][P2]
	>(a: P0, b: P1, c: P2, d: P3): Path<M, M[P0][P1][P2][P3]>;
	path<
		P0 extends keyof M,
		P1 extends keyof M[P0],
		P2 extends keyof M[P0][P1],
		P3 extends keyof M[P0][P1][P2],
		P4 extends keyof M[P0][P1][P2][P3]
	>(a: P0, b: P1, c: P2, d: P3, e: P4): Path<M, M[P0][P1][P2][P3][P4]>;
	at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>;
}

function isString(segment?: string): segment is string {
	return typeof segment === 'string';
}

/**
 * Application state store
 */
export class Store<T = any> extends Evented implements State<T> {

	/**
	 * The private state object
	 */
	private _state = {} as T;

	/**
	 * Returns the state at a specific pointer path location.
	 */
	public get = <U = any>(path: Path<T, U>): U => {
		return path.value;
	}

	/**
	 * Applies store operations to state and returns the undo operations
	 */
	public apply = (operations: PatchOperation<T>[], invalidate: boolean = false): PatchOperation<T>[] => {
		const patch = new Patch(operations);
		const patchResult = patch.apply(this._state);
		this._state = patchResult.object;
		if (invalidate) {
			this.invalidate();
		}
		return patchResult.undoOperations;
	}

	public at = <U = any>(path: Path<T, Array<U>>, index: number): Path<T, U> => {
		const array = this.get(path);
		const value = array && array[index];

		return {
			path: `${path.path}/${index}`,
			state: path.state,
			value
		};
	}

	/**
	 * Emits an invalidation event
	 */
	public invalidate(): any {
		this.emit({ type: 'invalidate' });
	}

	public path: State<T>['path']  = (path: string | Path<T, any>, ...segments: (string | undefined)[]) => {
		if (typeof path === 'string') {
			segments = [ path, ...segments ];
		}
		else {
			segments = [ ...new Pointer(path.path).segments, ...segments ];
		}

		const stringSegments = segments.filter<string>(isString);
		const hasMultipleSegments = stringSegments.length > 1;
		const pointer = new Pointer(hasMultipleSegments ? stringSegments : (stringSegments[0] || ''));

		return {
			path: pointer.path,
			state: this._state,
			value: pointer.get(this._state)
		};
	}
}

export default Store;
