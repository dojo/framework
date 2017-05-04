import { assign } from '@dojo/core/lang';
import { WidgetBase } from './WidgetBase';
import { Constructor, DNode, WidgetProperties } from './interfaces';

export interface GetProperties {
	<C, P extends WidgetProperties>(inject: C, properties: P): any;
}

export interface GetChildren {
	<C>(inject: C, children: DNode[]): DNode[];
}

export interface InjectorProperties extends WidgetProperties {
	render(): DNode;
	getProperties: GetProperties;
	properties: WidgetProperties;
	getChildren: GetChildren;
	children: DNode[];
}

export class BaseInjector<C> extends WidgetBase<InjectorProperties> {

	private _context: C;

	constructor(context: C = <C> {}) {
		super();
		this._context = context;
	}

	public toInject(): C {
		return this._context;
	}
}

/**
 * Mixin that extends the supplied Injector class with the proxy `render` and passing the provided to `context` to the Injector
 * class via the constructor.
 */
export function Injector<C, T extends Constructor<BaseInjector<C>>>(Base: T, context: C): T {

	class Injector extends Base {

		constructor(...args: any[]) {
			super(context);
		}

		protected render(): DNode {
			const {
				render,
				properties,
				getProperties,
				children,
				getChildren
			} = this.properties;
			const injectedChildren = getChildren(this.toInject(), children);

			assign(properties, getProperties(this.toInject(), properties));
			if (injectedChildren && injectedChildren.length) {
				children.push(...injectedChildren);
			}

			return render();
		}
	}
	return Injector;
}

export default Injector;
