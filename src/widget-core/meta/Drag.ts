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

	/**
	 * A matrix of posistions that represent the start position for the current drag interaction
	 */
	start?: PositionMatrix;
}

interface NodeData {
	dragResults: DragResults;
	invalidate: () => void;
	last: PositionMatrix;
	start: PositionMatrix;
}

/**
 * An x/y position structure
 */
export interface Position {
	x: number;
	y: number;
}

/**
 * A matrix of x/y positions
 */
export interface PositionMatrix {
	/**
	 * Client x/y position
	 */
	client: Position;

	/**
	 * Offset x/y position
	 */
	offset: Position;

	/**
	 * Page x/y position
	 */
	page: Position;

	/**
	 * Screen x/y position
	 */
	screen: Position;
}

function createNodeData(invalidate: () => void): NodeData {
	return {
		dragResults: deepAssign({}, emptyResults),
		invalidate,
		last: createPositionMatrix(),
		start: createPositionMatrix()
	};
}

/**
 * Creates an empty position
 */
function createPosition(): Position {
	return { x: 0, y: 0 };
}

/**
 * Create an empty position matrix
 */
function createPositionMatrix(): PositionMatrix {
	return {
		client: { x: 0, y: 0 },
		offset: { x: 0, y: 0 },
		page: { x: 0, y: 0 },
		screen: { x: 0, y: 0 }
	};
}

/**
 * A frozen empty result object, frozen to ensure that no one downstream modifies it
 */
const emptyResults = Object.freeze({
	delta: Object.freeze(createPosition()),
	isDragging: false
});

/**
 * Return the x/y position matrix for an event
 * @param event The pointer event
 */
function getPositionMatrix(event: PointerEvent): PositionMatrix {
	return {
		client: {
			x: event.clientX,
			y: event.clientY
		},
		offset: {
			x: event.offsetX,
			y: event.offsetY
		},
		page: {
			x: event.pageX,
			y: event.pageY
		},
		screen: {
			x: event.screenX,
			y: event.screenY
		}
	};
}

/**
 * Return the delta position between two positions
 * @param start The first position
 * @param current The second position
 */
function getDelta(start: PositionMatrix, current: PositionMatrix): Position {
	return {
		x: current.client.x - start.client.x,
		y: current.client.y - start.client.y
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
			state.last = state.start = getPositionMatrix(e);
			state.dragResults.delta = createPosition();
			state.dragResults.start = deepAssign({}, state.start);
			state.dragResults.isDragging = true;
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
		state.last = getPositionMatrix(e);
		state.dragResults.delta = getDelta(state.start, state.last);
		if (!state.dragResults.start) {
			state.dragResults.start = deepAssign({}, state.start);
		}
		state.invalidate();
	}

	private _onDragStop = (e: PointerEvent) => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		// state cannot be unset, using ! operator
		const state = this._nodeMap.get(_dragging)!;
		state.last = getPositionMatrix(e);
		state.dragResults.delta = getDelta(state.start, state.last);
		if (!state.dragResults.start) {
			state.dragResults.start = deepAssign({}, state.start);
		}
		state.dragResults.isDragging = false;
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
		// shallow "clone" the results, so no downstream manipulation can occur
		const dragResults = assign({}, state.dragResults);
		// we are offering up an accurate delta, so we need to take the last event position and move it to the start so
		// that our deltas are calculated from the last time they are read
		state.start = state.last;
		// clear the start state
		delete state.dragResults.start;

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

	public get(key: string | number): Readonly<DragResults> {
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
