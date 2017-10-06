import { deepAssign } from '@dojo/core/lang';
import global from '@dojo/shim/global';
import { assign } from '@dojo/shim/object';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

export interface DragResults {
	/**
	 * The movement of pointer during the duration of the drag state
	 */
	delta: Position;

	/**
	 * Is the DOM node currently in a drag state
	 */
	isDragging: boolean;
}

interface NodeData {
	dragResults: DragResults;
	invalidate: () => void;
	last: Position;
	start: Position;
}

export interface Position {
	x: number;
	y: number;
}

function createNodeData(invalidate: () => void): NodeData {
	return {
		dragResults: deepAssign({}, emptyResults),
		invalidate,
		last: createPosition(),
		start: createPosition()
	};
}

/**
 * Creates an empty position
 */
function createPosition(): Position {
	return { x: 0, y: 0 };
}

/**
 * A frozen empty result object, frozen to ensure that no one downstream modifies it
 */
const emptyResults = Object.freeze({
	delta: Object.freeze(createPosition()),
	isDragging: false
});

/**
 * Return the x/y position for an event
 * @param event The pointer event
 */
function getPosition(event: PointerEvent): Position {
	return {
		x: event.pageX,
		y: event.pageY
	};
}

/**
 * Return the delta position between two positions
 * @param start The first position
 * @param current The second position
 */
function getDelta(start: Position, current: Position): Position {
	return {
		x: current.x - start.x,
		y: current.y - start.y
	};
}

class DragController {
	private _nodeMap = new WeakMap<HTMLElement, NodeData>();
	private _dragging: HTMLElement | undefined = undefined;

	private _getData(target: HTMLElement): { state: NodeData, target: HTMLElement } | undefined {
		if (this._nodeMap.has(target)) {
			return { state: this._nodeMap.get(target)!, target };
		}
		if (target.parentElement) {
			return this._getData(target.parentElement);
		}
	}

	private _onDragStart = (e: PointerEvent) => {
		const data = this._getData(e.target as HTMLElement);
		if (data) {
			const { state, target } = data;
			this._dragging = target;
			state.dragResults.isDragging = true;
			state.last = state.start = getPosition(e);
			state.dragResults.delta = createPosition();
			state.invalidate();
		} // else, we are ignoring the event
	}

	private _onDrag = (e: PointerEvent) => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		// state cannot be unset, using ! operator
		const state = this._nodeMap.get(_dragging)!;
		state.last = getPosition(e);
		state.dragResults.delta = getDelta(state.start, state.last);
		state.invalidate();
	}

	private _onDragStop = (e: PointerEvent) => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		// state cannot be unset, using ! operator
		const state = this._nodeMap.get(_dragging)!;
		state.last = getPosition(e);
		state.dragResults = {
			delta: getDelta(state.start, state.last),
			isDragging: false
		};
		state.invalidate();
		this._dragging = undefined;
	}

	constructor() {
		const win: Window = global.window;
		win.addEventListener('pointerdown', this._onDragStart);
		// Use capture phase, to determine the right node target, as it will be top down versus bottom up
		win.addEventListener('pointermove', this._onDrag, true);
		win.addEventListener('pointerup', this._onDragStop, true);
	}

	public get(node: HTMLElement, invalidate: () => void): DragResults {
		const { _nodeMap } = this;
		// first time we see a node, we will initialize its state
		if (!_nodeMap.has(node)) {
			_nodeMap.set(node, createNodeData(invalidate));
			return emptyResults;
		}

		const state = _nodeMap.get(node)!;
		// we are offering up an accurate delta, so we need to take the last event position and move it to the start so
		// that our deltas are calculated from the last time they are read
		state.start = state.last;
		// shallow "clone" the results, so no downstream manipulation can occur
		const dragResults = assign({}, state.dragResults);

		// reset the delta after we have read any last delta while not dragging
		if (!dragResults.isDragging && dragResults.delta.x !== 0 && dragResults.delta.y !== 0) {
			// future reads of the delta will be blank
			state.dragResults.delta = createPosition();
		}

		return dragResults;
	}
}

const controller = new DragController();

export class Drag extends Base {
	private _boundInvalidate: () => void = this.invalidate.bind(this);

	public get(key: string): Readonly<DragResults> {
		const node = this.getNode(key);

		// if we don't have a reference to the node yet, return an empty set of results
		if (!node) {
			return emptyResults;
		}

		// otherwise we will ask the controller for our results
		return controller.get(node, this._boundInvalidate);
	}
}

export default Drag;
