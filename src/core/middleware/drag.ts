import global from '../../shim/global';
import { assign } from '../../shim/object';
import { deepAssign } from '../util';
import { create, destroy, invalidator, node } from '../vdom';
import icache from './icache';

/**
 * Results from a drag operation
 */
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

/**
 * An x/y position structure
 */
export interface Position {
	/** Horizontal coordinate */
	x: number;

	/** Vertical coordinate */
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

interface NodeData {
	dragResults: DragResults;
	invalidate: () => void;
	last: PositionMatrix;
	start: PositionMatrix;
}

function getDelta(start: PositionMatrix, current: PositionMatrix): Position {
	return {
		x: current.client.x - start.client.x,
		y: current.client.y - start.client.y
	};
}

function createNodeData(invalidate: () => void): NodeData {
	return {
		dragResults: deepAssign({}, emptyResults),
		invalidate,
		last: createPositionMatrix(),
		start: createPositionMatrix()
	};
}

function createPosition(): Position {
	return { x: 0, y: 0 };
}

function createPositionMatrix(): PositionMatrix {
	return {
		client: { x: 0, y: 0 },
		offset: { x: 0, y: 0 },
		page: { x: 0, y: 0 },
		screen: { x: 0, y: 0 }
	};
}

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

function initNode(node: HTMLElement): void {
	node.style.touchAction = 'none';
	node.setAttribute('touch-action', 'none');
}

const emptyResults = Object.freeze({
	delta: Object.freeze(createPosition()),
	isDragging: false
});

const factory = create({ destroy, icache, invalidator, node });

export const drag = factory(({ middleware: { destroy, icache, invalidator, node } }) => {
	const nodeMap = icache.getOrSet('nodeMap', () => new WeakMap<HTMLElement, NodeData>());

	function getData(target: HTMLElement): { state: NodeData; target: HTMLElement } | undefined {
		if (nodeMap.has(target)) {
			return { state: nodeMap.get(target)!, target };
		}
		if (target.parentElement) {
			return getData(target.parentElement);
		}
	}

	function onDragStart(event: PointerEvent) {
		const dragging = icache.get<HTMLElement>('dragging');
		if (!event.isPrimary && dragging) {
			const state = nodeMap.get(dragging)!;
			state.dragResults.isDragging = false;
			state.invalidate();
			icache.set('dragging', undefined);
			return;
		}
		if (event.button !== 0) {
			return;
		}
		const data = getData(event.target as HTMLElement);
		if (data) {
			const { state, target } = data;
			icache.set('dragging', target);
			state.last = state.start = getPositionMatrix(event);
			state.dragResults.delta = createPosition();
			state.dragResults.start = deepAssign({}, state.start);
			state.dragResults.isDragging = true;
			state.invalidate();

			event.preventDefault();
			event.stopPropagation();
		}
	}

	function onDrag(event: PointerEvent) {
		const dragging = icache.get<HTMLElement>('dragging');
		if (!dragging) {
			return;
		}
		// state cannot be unset, using ! operator
		const state = nodeMap.get(dragging)!;
		state.last = getPositionMatrix(event);
		state.dragResults.delta = getDelta(state.start, state.last);
		state.invalidate();

		event.preventDefault();
		event.stopPropagation();
	}

	function onDragStop(event: PointerEvent) {
		const dragging = icache.get<HTMLElement>('dragging');
		if (!dragging) {
			return;
		}
		// state cannot be unset, using ! operator
		const state = nodeMap.get(dragging)!;
		state.last = getPositionMatrix(event);
		state.dragResults.delta = getDelta(state.start, state.last);
		state.dragResults.isDragging = false;
		state.invalidate();
		icache.set('dragging', undefined);

		event.preventDefault();
		event.stopPropagation();
	}

	if (!icache.get('initialized')) {
		const win: Window = global;
		win.addEventListener('pointerdown', onDragStart);
		win.addEventListener('pointermove', onDrag, true);
		win.addEventListener('pointerup', onDragStop, true);
	}

	destroy(() => {
		const win: Window = global;
		win.removeEventListener('pointerdown', onDragStart);
		win.removeEventListener('pointermove', onDrag, true);
		win.removeEventListener('pointerup', onDragStop, true);
	});

	return {
		get(key: string | number): Readonly<DragResults> {
			const domNode = node.get(key);

			if (!domNode) return emptyResults;

			if (!nodeMap.has(domNode)) {
				nodeMap.set(domNode, createNodeData(invalidator));
				initNode(domNode);
				return emptyResults;
			}

			const state = nodeMap.get(domNode)!;
			const dragResults = assign({}, state.dragResults);
			state.start = state.last;
			state.dragResults.delta = createPosition();
			delete state.dragResults.start;

			return dragResults;
		}
	};
});

export default drag;
