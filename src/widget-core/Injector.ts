import { assign } from '@dojo/core/lang';
import { Evented } from '@dojo/core/Evented';
import {
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
	<P extends WidgetProperties>(inject: any, properties: P): any;
}

export interface GetChildren {
	(inject: any, children: DNode[]): DNode[];
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
	scope: WidgetBase;
	render(): DNode | DNode[];
	getProperties?: GetProperties;
	properties: any;
	getChildren?: GetChildren;
	children: DNode[];
}

export interface Base<C = Context> {
	toInject(): C;
}

export class Base<C = Context> extends WidgetBase<InjectorProperties> implements Base<C> {

	protected context: C = <C> {};

	public toInject(): C {
		return this.context;
	}
}

export class BaseInjector<C extends Evented = Context> extends Base<C> {

	constructor(context?: C) {
		super();
		if (context) {
			this.context = context;
			this.context.on('invalidate', this.invalidate.bind(this));
		}
	}

}

/**
 * Mixin that extends the supplied Injector class with the proxy `render` and passing the provided to `context` to the Injector
 * class via the constructor.
 */
export function Injector<C, T extends Constructor<Base<C>>>(Base: T, context: C): T {

	@diffProperty('render', always)
	class Injector extends Base {

		constructor(...args: any[]) {
			super(context);
		}

		protected decorateBind(node: DNode | DNode[]): DNode | DNode[] {
			const { scope } = this.properties;
			decorate(node, (node: any) => {
				const { properties } = node;
				properties.bind = scope;
			}, (node: DNode) => { return isHNode(node) || isWNode(node); });

			return node;
		}

		protected render(): DNode | DNode[] {
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

			return this.decorateBind(render());
		}

		protected runAfterRenders(dNode: DNode | DNode[]): DNode | DNode[] {
			return super.runAfterRenders.call(this.properties.scope, dNode);
		}
	}
	return Injector;
}

export default Injector;
