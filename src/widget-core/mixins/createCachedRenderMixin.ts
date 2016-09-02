import { h, VNode, VNodeProperties } from 'maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createStateful, { State, Stateful, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { assign } from 'dojo-core/lang';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import createRenderable, { Renderable } from './createRenderable';
import createVNodeEvented, { VNodeEvented } from './createVNodeEvented';
import { Parent } from './interfaces';

export type StylesHash = { [style: string]: string; };

export interface CachedRenderState extends State {
	/**
	 * The ID of this widget
	 */
	id?: string;

	/**
	 * Any label text for this widget
	 */
	label?: string;

	/**
	 * Any classes to set at construction to the VNode
	 */
	classes?: string[];

	/**
	 * Any styles to set at startup to the VNode
	 */
	styles?: StylesHash;
}

export type CachedRenderParent = Parent & {
	/**
	 * Invalidate the widget so that it will recalculate on its next render
	 */
	invalidate(): void;
}

export interface CachedRender {
	/**
	 * Returns the node attribute properties to be used by a render function
	 * @param overrides Any optional overrides of properties
	 */
	getNodeAttributes(overrides?: VNodeProperties): VNodeProperties;

	/**
	 * Returns any children VNodes that are part of the widget
	 */
	getChildrenNodes(): (VNode | string)[];

	/**
	 * Invalidate the widget so that it will recalculate on its next render
	 */
	invalidate(): void;

	/**
	 * The ID of the widget
	 *
	 * TODO: Mark readonly in TS2
	 */
	id: string;

	/**
	 * An array of strings that represent classes to be set on the widget.  If classes are present in the state, getting and
	 * setting classes is done on the state, otherwise they are shadowed on the instance.
	 */
	classes: string[];

	render(): VNode;

	/**
	 * A has of styles that should be applied to root VNode of the widget.  If styles are present in the state, getting and
	 * setting classes is done on the state, otherwiser they are shadowed on the instance.
	 */
	styles: StylesHash;
}

export interface CachedRenderOverrides {
	/**
	 * The parent of the widget
	 */
	parent?: CachedRenderParent;
}

export type CachedRenderMixin<S extends CachedRenderState> = Stateful<S> & Renderable & CachedRender & VNodeEvented & CachedRenderOverrides;

export interface CachedRenderFactory extends ComposeFactory<CachedRenderMixin<CachedRenderState>, StatefulOptions<CachedRenderState>> {
	idBase: string;
}

/**
 * A map of dirty flags used when determining if the render function
 * should be called
 */
const dirtyMap = new Map<CachedRenderMixin<CachedRenderState>, boolean>();

/**
 * A weak map of the rendered VNode to return when the widget is
 * not dirty.
 */
const renderCache = new WeakMap<CachedRenderMixin<CachedRenderState>, VNode>();

/**
 * A weak map to shadow the classes for the widget
 */
const shadowClasses = new WeakMap<CachedRenderMixin<CachedRenderState>, string[]>();

/**
 * A weak map to shadow the styles for the widget
 */
const shadowStyles = new WeakMap<CachedRenderMixin<CachedRenderState>, StylesHash>();

/**
 * The counter for generating a unique ID
 */
let cachedRenderCount = 0;

/**
 * A function that generates an ID
 */
function generateID(cachedRender: CachedRenderMixin<CachedRenderState>): string {
	const id = `${createCachedRenderMixin.idBase}${++cachedRenderCount}`;
	cachedRender.setState({ id });
	return id;
}

/**
 * A weak map of the historic classes associated to a specific widget
 */
const widgetClassesMap = new WeakMap<CachedRenderMixin<CachedRenderState>, string[]>();

const createCachedRenderMixin = createStateful
	.mixin(createRenderable)
	.mixin({
		mixin: createVNodeEvented,
		initialize(instance: CachedRenderMixin<CachedRenderState>) {
			instance.own(instance.on('statechange', () => { instance.invalidate(); } ));
		}
	})
	.mixin({
		mixin: <CachedRender> {
			getNodeAttributes(this: CachedRenderMixin<CachedRenderState>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
				for (let key in this.listeners) {
					props[key] = this.listeners[key];
				}
				const classes: { [index: string]: boolean; } = {};
				const widgetClasses = widgetClassesMap.get(this);

				widgetClasses.forEach((c) => classes[c] = false);

				if (this.classes) {
					this.classes.forEach((c) => classes[c] = true);
					widgetClassesMap.set(this, this.classes);
				}

				props.classes = classes;
				props.styles = this.styles || {};
				props.key = this;
				if (overrides) {
					assign(props, overrides);
				}
				return props;
			},

			getChildrenNodes(this: CachedRenderMixin<CachedRenderState>): (VNode | string)[] {
				return this.state.label ? [ this.state.label ] : undefined;
			},

			render(this: CachedRenderMixin<CachedRenderState>): VNode {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				let cached = renderCache.get(cachedRender);
				if (!dirtyMap.get(cachedRender) && cached) {
					return cached;
				}
				else {
					cached = h(cachedRender.tagName, cachedRender.getNodeAttributes(), cachedRender.getChildrenNodes());
					renderCache.set(cachedRender, cached);
					dirtyMap.set(cachedRender, false);
					return cached;
				}
			},

			invalidate(this: CachedRenderMixin<CachedRenderState>): void {
				if (dirtyMap.get(this)) { /* short circuit if already dirty */
					return;
				}
				const parent = this.parent;
				dirtyMap.set(this, true);
				renderCache.delete(this); /* Allow GC to occur on renderCache */
				if (parent && parent.invalidate) {
					parent.invalidate();
				}
			},

			get id(this: CachedRenderMixin<CachedRenderState>): string {
				return (this.state && this.state.id) || generateID(this);
			},

			get classes(this: CachedRenderMixin<CachedRenderState>): string[] {
				return (this.state && this.state.classes) || shadowClasses.get(this);
			},

			set classes(this: CachedRenderMixin<CachedRenderState>, value: string[]) {
				if (this.state.classes) {
					this.setState({ classes: value });
				}
				else {
					shadowClasses.set(this, value);
					this.invalidate();
				}
			},

			get styles(this: CachedRenderMixin<CachedRenderState>): StylesHash {
				return (this.state && this.state.styles) || shadowStyles.get(this);
			},

			set styles(this: CachedRenderMixin<CachedRenderState>, value: StylesHash) {
				if (this.state.styles) {
					this.setState({ styles: value });
				}
				else {
					shadowStyles.set(this, value);
					this.invalidate();
				}
			}
		},
		initialize(instance) {
			/* at this point, casting instance as the final type blows up the type inference, so the only choice is to
			* cast as any */
			dirtyMap.set(instance, true);
			shadowClasses.set(instance, []);
			widgetClassesMap.set(instance, []);
		}
	})
	.static({
		idBase: 'widget'
	}) as CachedRenderFactory;

export default createCachedRenderMixin;
