import { Destroyable } from '@dojo/core/Destroyable';
import global from '@dojo/shim/global';
import Map from '@dojo/shim/Map';
import { WidgetMetaBase, WidgetMetaProperties, WidgetMetaRequiredNodeCallback } from '../interfaces';

export class Base extends Destroyable implements WidgetMetaBase {
	private _invalidate: () => void;
	private _invalidating: number;
	private _requiredNodes: Map<string, ([ WidgetMetaBase, WidgetMetaRequiredNodeCallback ])[]>;
	protected nodes: Map<string, HTMLElement>;

	constructor(properties: WidgetMetaProperties) {
		super();

		this._invalidate = properties.invalidate;
		this._requiredNodes = properties.requiredNodes;

		this.nodes = properties.nodes;
	}

	public has(key: string): boolean {
		return this.nodes.has(key);
	}

	protected invalidate(): void {
		global.cancelAnimationFrame(this._invalidating);
		this._invalidating = global.requestAnimationFrame(this._invalidate);
	}

	protected requireNode(key: string, callback?: WidgetMetaRequiredNodeCallback): void {
		const node = this.nodes.get(key);
		if (node) {
			callback && callback.call(this, node);
		}
		else {
			const callbacks = this._requiredNodes.get(key) || [];
			callback && callbacks.push([ this, callback ]);
			this._requiredNodes.set(key, callbacks);
			if (!callback) {
				this.invalidate();
			}
		}
	}
}

export default Base;
