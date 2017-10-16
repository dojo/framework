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
		const stringKey = `${key}`;
		const node = this.nodeHandler.get(stringKey);

		if (!node && !this._requestedNodeKeys.has(stringKey)) {
			const handle = this.nodeHandler.on(stringKey, () => {
				handle.destroy();
				this._requestedNodeKeys.delete(stringKey);
				this.invalidate();
			});

			this.own(handle);
			this._requestedNodeKeys.add(stringKey);
		}

		return node;
	}

	protected invalidate(): void {
		this._invalidate();
	}
}

export default Base;
