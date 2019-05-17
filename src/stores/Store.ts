import { Evented } from '../core/Evented';
import { Patch, PatchOperation } from './state/Patch';
import { Pointer } from './state/Pointer';
import Map from '../shim/Map';

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
	at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>;
	path: StatePaths<M>;
}

export interface StatePaths<M> {
	<T, P0 extends keyof Required<T>>(path: Path<M, T>, a: P0): Path<M, Required<T>[P0]>;
	<T, P0 extends keyof T, P1 extends keyof Required<T>[P0]>(path: Path<M, T>, a: P0, b: P1): Path<
		M,
		Required<Required<T>[P0]>[P1]
	>;
	<T, P0 extends keyof T, P1 extends keyof Required<T>[P0], P2 extends keyof Required<Required<T>[P0]>[P1]>(
		path: Path<M, T>,
		a: P0,
		b: P1,
		c: P2
	): Path<M, Required<Required<Required<T>[P0]>[P1]>[P2]>;
	<
		T,
		P0 extends keyof T,
		P1 extends keyof Required<T>[P0],
		P2 extends keyof Required<Required<T>[P0]>[P1],
		P3 extends keyof Required<Required<Required<T>[P0]>[P1]>[P2]
	>(
		path: Path<M, T>,
		a: P0,
		b: P1,
		c: P2,
		d: P3
	): Path<M, Required<Required<Required<Required<T>[P0]>[P1]>[P2]>[P3]>;
	<
		T,
		P0 extends keyof T,
		P1 extends keyof Required<T>[P0],
		P2 extends keyof Required<Required<T>[P0]>[P1],
		P3 extends keyof Required<Required<Required<T>[P0]>[P1]>[P2],
		P4 extends keyof Required<Required<Required<Required<T>[P0]>[P1]>[P2]>[P3]
	>(
		path: Path<M, T>,
		a: P0,
		b: P1,
		c: P2,
		d: P3,
		e: P4
	): Path<M, Required<Required<Required<Required<Required<T>[P0]>[P1]>[P2]>[P3]>[P4]>;
	<P0 extends keyof M>(a: P0): Path<M, Required<M>[P0]>;
	<P0 extends keyof M, P1 extends keyof Required<M>[P0]>(a: P0, b: P1): Path<M, Required<Required<M>[P0]>[P1]>;
	<P0 extends keyof M, P1 extends keyof Required<M>[P0], P2 extends keyof Required<Required<M>[P0]>[P1]>(
		a: P0,
		b: P1,
		c: P2
	): Path<M, Required<Required<Required<M>[P0]>[P1]>[P2]>;
	<
		P0 extends keyof M,
		P1 extends keyof Required<M>[P0],
		P2 extends keyof Required<Required<M>[P0]>[P1],
		P3 extends keyof Required<Required<Required<M>[P0]>[P1]>[P2]
	>(
		a: P0,
		b: P1,
		c: P2,
		d: P3
	): Path<M, Required<Required<Required<Required<M>[P0]>[P1]>[P2]>[P3]>;
	<
		P0 extends keyof M,
		P1 extends keyof Required<M>[P0],
		P2 extends keyof Required<Required<M>[P0]>[P1],
		P3 extends keyof Required<Required<Required<M>[P0]>[P1]>[P2],
		P4 extends keyof Required<Required<Required<Required<M>[P0]>[P1]>[P2]>[P3]
	>(
		a: P0,
		b: P1,
		c: P2,
		d: P3,
		e: P4
	): Path<M, Required<Required<Required<Required<Required<M>[P0]>[P1]>[P2]>[P3]>[P4]>;
}

interface OnChangeCallback {
	callbackId: number;
	callback: () => void;
}

interface OnChangeValue {
	callbacks: OnChangeCallback[];
	previousValue: any;
}

function isString(segment?: string): segment is string {
	return typeof segment === 'string';
}

export interface MutableState<T = any> extends State<T> {
	/**
	 * Applies store operations to state and returns the undo operations
	 */
	apply(operations: PatchOperation<T>[]): PatchOperation<T>[];
}

export class DefaultState<T = any> implements MutableState<T> {
	/**
	 * The private state object
	 */
	private _state = {} as T;

	/**
	 * Returns the state at a specific pointer path location.
	 */
	public get = <U = any>(path: Path<T, U>): U => {
		return path.value;
	};

	/**
	 * Applies store operations to state and returns the undo operations
	 */
	public apply = (operations: PatchOperation<T>[]): PatchOperation<T>[] => {
		const patch = new Patch(operations);
		const patchResult = patch.apply(this._state);
		this._state = patchResult.object;
		return patchResult.undoOperations;
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

		return {
			path: pointer.path,
			state: this._state,
			value: pointer.get(this._state)
		};
	};
}

/**
 * Application state store
 */
export class Store<T = any> extends Evented implements MutableState<T> {
	private _adapter: MutableState<T> = new DefaultState<T>();

	private _changePaths = new Map<string, OnChangeValue>();

	private _callbackId = 0;

	/**
	 * Returns the state at a specific pointer path location.
	 */
	public get = <U = any>(path: Path<T, U>): U => {
		return this._adapter.get(path);
	};

	constructor(options?: { state?: MutableState<T> }) {
		super();
		if (options && options.state) {
			this._adapter = options.state;
			this.path = this._adapter.path.bind(this._adapter);
		}
	}

	/**
	 * Applies store operations to state and returns the undo operations
	 */
	public apply = (operations: PatchOperation<T>[], invalidate: boolean = false): PatchOperation<T>[] => {
		const result = this._adapter.apply(operations);

		if (invalidate) {
			this.invalidate();
		}

		return result;
	};

	public at = <U = any>(path: Path<T, Array<U>>, index: number): Path<T, U> => {
		return this._adapter.at(path, index);
	};

	public onChange = <U = any>(paths: Path<T, U> | Path<T, U>[], callback: () => void) => {
		const callbackId = this._callbackId;
		if (!Array.isArray(paths)) {
			paths = [paths];
		}
		paths.forEach((path) => this._addOnChange(path, callback, callbackId));
		this._callbackId += 1;
		return {
			remove: () => {
				(paths as Path<T, U>[]).forEach((path) => {
					const onChange = this._changePaths.get(path.path);
					if (onChange) {
						onChange.callbacks = onChange.callbacks.filter((callback) => {
							return callback.callbackId !== callbackId;
						});
					}
				});
			}
		};
	};

	private _addOnChange = <U = any>(path: Path<T, U>, callback: () => void, callbackId: number): void => {
		let changePaths = this._changePaths.get(path.path);
		if (!changePaths) {
			changePaths = { callbacks: [], previousValue: this.get(path) };
		}
		changePaths.callbacks.push({ callbackId, callback });
		this._changePaths.set(path.path, changePaths);
	};

	private _runOnChanges() {
		const callbackIdsCalled: number[] = [];
		this._changePaths.forEach((value: OnChangeValue, path: string) => {
			const { previousValue, callbacks } = value;
			const pointer = new Pointer(path);
			const newValue = pointer.segments.length
				? (this._adapter as any).path(pointer.segments[0] as keyof T, ...pointer.segments.slice(1)).value
				: undefined;
			if (previousValue !== newValue) {
				this._changePaths.set(path, { callbacks, previousValue: newValue });
				callbacks.forEach((callbackItem) => {
					const { callback, callbackId } = callbackItem;
					if (callbackIdsCalled.indexOf(callbackId) === -1) {
						callbackIdsCalled.push(callbackId);
						callback();
					}
				});
			}
		});
	}

	/**
	 * Emits an invalidation event
	 */
	public invalidate(): any {
		this._runOnChanges();
		this.emit({ type: 'invalidate' });
	}

	public path: State<T>['path'] = this._adapter.path.bind(this._adapter);
}

export default Store;
