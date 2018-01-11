const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { OperationType, PatchOperation } from './../../src/state/Patch';
import { CommandRequest, createProcess } from './../../src/process';
import { Pointer } from './../../src/state/Pointer';
import { createUndoManager } from './../../src/extras';
import { Store } from './../../src/Store';

function incrementCounter({ get, path }: CommandRequest<{ counter: number }>): PatchOperation[] {
	let counter = get(path('counter')) || 0;
	return [{ op: OperationType.REPLACE, path: new Pointer('/counter'), value: ++counter }];
}

describe('extras', () => {
	it('collects undo functions for all processes using collector', () => {
		const { undoCollector, undoer } = createUndoManager();
		const store = new Store();
		let localUndoStack: any[] = [];
		const incrementCounterProcess = createProcess([incrementCounter], {
			callback: undoCollector((error, result) => {
				localUndoStack.push(result.undo);
			})
		});
		const executor = incrementCounterProcess(store);
		executor({});
		assert.strictEqual(store.get(store.path('counter')), 1);
		executor({});
		assert.strictEqual(store.get(store.path('counter')), 2);
		executor({});
		assert.strictEqual(store.get(store.path('counter')), 3);
		localUndoStack[2]();
		assert.strictEqual(store.get(store.path('counter')), 2);
		undoer();
		assert.strictEqual(store.get(store.path('counter')), 1);
	});

	it('undo has no effect if there are no undo functions on the stack', () => {
		const { undoer } = createUndoManager();
		const store = new Store();
		const incrementCounterProcess = createProcess([incrementCounter]);
		const executor = incrementCounterProcess(store);
		executor({});
		undoer();
		assert.strictEqual(store.get(store.path('counter')), 1);
	});

	it('local undo throws an error if global undo has already been executed', () => {
		const { undoCollector, undoer } = createUndoManager();
		const store = new Store();
		let localUndo: any;
		const incrementCounterProcess = createProcess([incrementCounter], {
			callback: undoCollector((error, result) => {
				localUndo = result.undo;
			})
		});
		const executor = incrementCounterProcess(store);
		executor({});
		assert.strictEqual(store.get(store.path('counter')), 1);
		undoer();
		assert.throws(
			() => {
				localUndo && localUndo();
			},
			Error,
			'Test operation failure. Unable to apply any operations.'
		);
	});
});
