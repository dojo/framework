import { Destroyable } from '@dojo/core/Destroyable';
import Set from '@dojo/shim/Set';
import { WidgetMetaBase, WidgetMetaProperties, NodeHandlerInterface, WidgetBaseInterface } from '../interfaces';

export class Base extends Destroyable implements WidgetMetaBase {
	private _invalidate: () => void;
	protected nodeHandler: NodeHandlerInterface;

	private _requestedNodeKeys = new Set<string | number>();

	protected _bind: WidgetBaseInterface | undefined;

	constructor(properties: WidgetMetaProperties) {
		super();

		this._invalidate = properties.invalidate;
		this.nodeHandler = properties.nodeHandler;
		if (properties.bind) {
			this._bind = properties.bind;
		}
	}

	public has(key: string | number): boolean {
		return this.nodeHandler.has(key);
	}

	protected getNode(key: string | number): Element | undefined {
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

	public afterRender(): void {
		// Do nothing by default.
	}
}

export default Base;
