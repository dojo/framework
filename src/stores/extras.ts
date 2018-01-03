import { ProcessError, ProcessResult, ProcessCallback, ProcessCallbackDecorator, Undo } from './process';

/**
 * Undo manager interface
 */
export interface UndoManager {
	undoCollector: ProcessCallbackDecorator;
	undoer: () => void;
}

/**
 * Factory function that returns an undoer function that will undo the last executed process and a
 * higher order collector function that can be used as the process callback.
 */
export function createUndoManager(): UndoManager {
	const undoStack: Undo[] = [];

	return {
		undoCollector: (callback?: any): ProcessCallback => {
			return (error: ProcessError | null, result: ProcessResult): void => {
				const { undo } = result;
				undoStack.push(undo);

				result.undo = (): void => {
					const index = undoStack.indexOf(undo);
					if (index !== -1) {
						undoStack.splice(index, 1);
					}
					undo();
				};
				callback && callback(error, result);
			};
		},
		undoer: (): void => {
			const undo = undoStack.pop();
			if (undo !== undefined) {
				undo();
			}
		}
	};
}
