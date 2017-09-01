import { Destroyable } from '@dojo/core/Destroyable';
import global from '@dojo/shim/global';
import Map from '@dojo/shim/Map';
import Set from '@dojo/shim/Set';
import { WidgetMetaProperties } from '../interfaces';

export class Base extends Destroyable {
	private _invalidate: () => void;
	private _invalidating: number;
	private _requiredNodes: Set<string>;
	protected nodes: Map<string, HTMLElement>;

	constructor(properties: WidgetMetaProperties) {
		super();

		this._invalidate = properties.invalidate;
		this._requiredNodes = properties.requiredNodes;

		this.nodes = properties.nodes;
	}

	public has(key: string): boolean {
		this.requireNode(key);
		return this.nodes.has(key);
	}

	protected invalidate(): void {
		global.cancelAnimationFrame(this._invalidating);
		this._invalidating = global.requestAnimationFrame(this._invalidate);
	}

	protected requireNode(key: string): void {
		this._requiredNodes.add(key);

		if (!this.nodes.has(key)) {
			this.invalidate();
		}
	}
}

export default Base;
