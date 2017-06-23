import { assign } from '@dojo/core/lang';
import { Evented } from '@dojo/core/Evented';
import {
	afterRender,
	diffProperty,
	WidgetBase
} from './WidgetBase';
import { decorate, isHNode, isWNode } from './d';
import { always } from './diff';
import {
	Constructor,
	DNode,
	WidgetProperties
} from './interfaces';

export interface GetProperties {
	<C, P extends WidgetProperties>(inject: C, properties: P): any;
}

export interface GetChildren {
	<C>(inject: C, children: DNode[]): DNode[];
}

/**
 * The binding mappers for properties and children.
 */
export interface Mappers {
	getProperties: GetProperties;
	getChildren: GetChildren;
}

/**
 * Default noop Mappers for the container.
 */
export const defaultMappers: Mappers = {
	getProperties(inject: any, properties: any): any {
		return Object.create(null);
	},
	getChildren(inject: any, children: DNode[]): DNode[] {
		return [];
	}
};

/**
 * Base context class that extends Evented and
 * returns the context using `.get()`.
 */
export class Context<T = any> extends Evented {

	private _context: T;

	constructor(context: T = <T> {}) {
		super({});
		this._context = context;
	}

	public get(): T {
		return this._context;
	}

	public set(context: T): void {
		this._context = context;
		this.emit({ type: 'invalidate' });
	}
}

export interface InjectorProperties extends WidgetProperties {
	scope: any;
	render(): DNode;
	getProperties?: GetProperties;
	properties: any;
	getChildren?: GetChildren;
	children: DNode[];
}

export class BaseInjector<C extends Evented = Context> extends WidgetBase<InjectorProperties> {

	protected context: C = <C> {};

	constructor(context?: C) {
		super();
		if (context) {
			this.context = context;
			this.context.on('invalidate', this.invalidate.bind(this));
		}
	}

	public toInject(): C {
		return this.context;
	}
}

/**
 * Mixin that extends the supplied Injector class with the proxy `render` and passing the provided to `context` to the Injector
 * class via the constructor.
 */
export function Injector<C extends Evented, T extends Constructor<BaseInjector<C>>>(Base: T, context: C): T {

	@diffProperty('render', always)
	class Injector extends Base {

		constructor(...args: any[]) {
			super(context);
		}

		@afterRender()
		protected decorateBind(node: DNode): DNode {
			const { scope } = this.properties;
			decorate(node, (node: any) => {
				const { properties } = node;
				properties.bind = scope;
			}, (node: DNode) => { return isHNode(node) || isWNode(node); });

			return node;
		}

		protected render(): DNode {
			const {
				render,
				properties,
				getProperties = defaultMappers.getProperties,
				children,
				getChildren = defaultMappers.getChildren
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
