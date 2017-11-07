import { Evented } from '@dojo/core/Evented';
import { Patch, PatchOperation } from './state/Patch';
import { Pointer } from './state/Pointer';

/**
 * Application state store
 */
export class Store extends Evented {

	/**
	 * The private state object
	 */
	private _state: object = {};

	/**
	 * Returns the state at a specific pointer path location.
	 *
	 * @param pointer The StorePointer path to the state that is required.
	 */
	public get = <T>(pointer: string): T => {
		const statePointer = new Pointer(pointer);
		return statePointer.get(this._state);
	}

	/**
	 * Applies store operations to state and returns the undo operations
	 */
	public apply = (operations: PatchOperation[], invalidate: boolean = false): PatchOperation[] => {
		const patch = new Patch(operations);
		const patchResult = patch.apply(this._state);
		this._state = patchResult.object;
		if (invalidate) {
			this.invalidate();
		}
		return patchResult.undoOperations;
	}

	/**
	 * Emits an invalidation event
	 */
	public invalidate(): any {
		this.emit({ type: 'invalidate' });
	}
}

export default Store;
