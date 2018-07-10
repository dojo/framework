import { processExecutor, getProcess, ProcessError, ProcessResult, ProcessCallback } from '../process';
import { PatchOperation } from '../state/Patch';
import { Pointer } from '../state/Pointer';
import Store from '../Store';
import WeakMap from '@dojo/shim/WeakMap';

export interface HistoryOperation {
	id: string;
	operations: PatchOperation[];
}

export interface HistoryData {
	history: HistoryOperation[];
	redo: HistoryOperation[];
}

export class HistoryManager {
	private _storeMap = new WeakMap();

	public collector(callback?: ProcessCallback): ProcessCallback {
		return (error: ProcessError | null, result: ProcessResult): void => {
			const { operations, undoOperations, id, store } = result;
			const { history, undo } = this._storeMap.get(store) || {
				history: [],
				undo: []
			};
			history.push({ id, operations });
			undo.push({ id, operations: undoOperations });
			this._storeMap.set(store, { history, undo, redo: [] });
			callback && callback(error, result);
		};
	}

	public canUndo(store: Store): boolean {
		const stacks = this._storeMap.get(store);
		if (stacks) {
			const { history, undo } = stacks;
			if (undo.length && history.length) {
				return true;
			}
		}
		return false;
	}

	public canRedo(store: Store): boolean {
		const stacks = this._storeMap.get(store);
		if (stacks) {
			const { redo } = stacks;
			if (redo.length) {
				return true;
			}
		}
		return false;
	}

	public redo(store: Store) {
		const stacks = this._storeMap.get(store);
		if (stacks) {
			const { history, redo, undo } = stacks;
			if (redo.length) {
				const { id, operations } = redo.pop();
				const result = store.apply(operations);
				history.push({ id, operations });
				undo.push({ id, operations: result });
				this._storeMap.set(store, { history, undo, redo });
			}
		}
	}

	public undo(store: Store) {
		const stacks = this._storeMap.get(store);
		if (stacks) {
			const { history, undo, redo } = stacks;
			if (undo.length && history.length) {
				const { id, operations } = undo.pop();
				history.pop();
				const result = store.apply(operations);
				redo.push({ id, operations: result });
				this._storeMap.set(store, { history, undo, redo });
			}
		}
	}

	public deserialize(store: Store, data: HistoryData) {
		const { history, redo } = data;
		history.forEach(({ id, operations }: HistoryOperation) => {
			operations = operations.map((operation) => {
				operation.path = new Pointer(String(operation.path));
				return operation;
			});
			let callback;
			const process = getProcess(id);
			if (process) {
				callback = process[2];
			}
			processExecutor(id, [() => operations], store, callback, undefined)({});
		});
		const stacks = this._storeMap.get(store);
		redo.forEach(({ id, operations }: HistoryOperation) => {
			operations = operations.map((operation) => {
				operation.path = new Pointer(String(operation.path));
				return operation;
			});
		});
		stacks.redo = redo;
	}

	public serialize(store: Store): HistoryData {
		const stacks = this._storeMap.get(store);
		if (stacks) {
			return {
				history: stacks.history,
				redo: stacks.redo
			};
		}
		return { history: [], redo: [] };
	}
}

export default HistoryManager;
