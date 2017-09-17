import { Destroyable } from '@dojo/core/Destroyable';
import Set from '@dojo/shim/Set';
import { WidgetMetaBase, WidgetMetaProperties, NodeHandlerInterface } from '../interfaces';

export class Base extends Destroyable implements WidgetMetaBase {
	private _invalidate: () => void;
	protected nodeHandler: NodeHandlerInterface;

	private _requestedNodeKeys = new Set<string | number>();

	constructor(properties: WidgetMetaProperties) {
		super();

		this._invalidate = properties.invalidate;
		this.nodeHandler = properties.nodeHandler;
	}

	public has(key: string | number): boolean {
		return this.nodeHandler.has(key);
	}

	protected getNode(key: string | number): HTMLElement | undefined {
		const node = this.nodeHandler.get(key);

		if (!node && !this._requestedNodeKeys.has(key)) {
			const handle = this.nodeHandler.on(`${key}`, () => {
				handle.destroy();
				this._requestedNodeKeys.delete(key);
				this.invalidate();
			});

			this.own(handle);
			this._requestedNodeKeys.add(key);
		}

		return node;
	}

	protected invalidate(): void {
		this._invalidate();
	}
}

export default Base;
