import { Evented } from '@dojo/core/Evented';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import { NodeHandlerInterface } from './interfaces';

/**
 * Enum to identify the type of event.
 * Listening to 'Projector' will notify when projector is created or updated
 * Listening to 'Widget' will notifiy when widget root is created or updated
 */
export enum NodeEventType {
	Projector = 'Projector',
	Widget = 'Widget'
}

export class NodeHandler extends Evented implements NodeHandlerInterface {

	private _nodeMap = new Map<string, HTMLElement>();

	public get(key: string): HTMLElement | undefined {
		return this._nodeMap.get(key);
	}

	public has(key: string): boolean {
		return this._nodeMap.has(key);
	}

	public add(element: HTMLElement, properties: VNodeProperties): void {
		const key = String(properties.key);
		this._nodeMap.set(key, element);
		this.emit({ type: key });
	}

	public addRoot(element: HTMLElement, properties: VNodeProperties): void {
		if (properties && properties.key) {
			this.add(element, properties);
		}

		this.emit({ type: NodeEventType.Widget });
	}

	public addProjector(): void {
		this.emit({ type: NodeEventType.Projector });
	}

	public clear(): void {
		this._nodeMap.clear();
	}
}

export default NodeHandler;
