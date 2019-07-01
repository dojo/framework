import { Evented, EventObject } from '../core/Evented';
import Map from '../shim/Map';
import { NodeHandlerInterface } from './interfaces';

/**
 * Enum to identify the type of event.
 * Listening to 'Projector' will notify when projector is created or updated
 * Listening to 'Widget' will notify when widget root is created or updated
 */
export enum NodeEventType {
	Projector = 'Projector',
	Widget = 'Widget'
}

export type NodeHandlerEventMap = {
	Projector: EventObject<NodeEventType.Projector>;
	Widget: EventObject<NodeEventType.Widget>;
};

export class NodeHandler extends Evented<NodeHandlerEventMap> implements NodeHandlerInterface {
	private _nodeMap = new Map<string | number, Element>();

	public get(key: string | number): Element | undefined {
		return this._nodeMap.get(key);
	}

	public has(key: string | number): boolean {
		return this._nodeMap.has(key);
	}

	public add(element: Element, key: string | number): void {
		this._nodeMap.set(key, element);
		this.emit({ type: `${key}` });
	}

	public addRoot(): void {
		this.emit({ type: NodeEventType.Widget });
	}

	public remove(key: string | number) {
		this._nodeMap.delete(key);
	}

	public addProjector(): void {
		this.emit({ type: NodeEventType.Projector });
	}

	public clear(): void {
		this._nodeMap.clear();
	}
}

export default NodeHandler;
