import { ComposeFactory } from 'dojo-compose/compose';
import createStateful, { State, Stateful, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { assign } from 'dojo-core/lang';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import { h, VNode, VNodeProperties } from 'maquette';
import { Parent, RenderFunction, StylesHash } from './interfaces';

export interface RenderMixinState extends State {
	/**
	 * Any classes to set at construction to the VNode
	 */
	classes?: string[];

	/**
	 * The ID of this widget
	 */
	id?: string;

	/**
	 * Any label text for this widget
	 */
	label?: string;

	/**
	 * Any styles to set at startup to the VNode
	 */
	styles?: StylesHash;
}

/**
 * A function that is called when collecting the node attributes on render, accepting the current set of
 * attributes and returning a set of VNode properties that should mixed into the current attributes.
 */
export interface NodeAttributeFunction {
	(attributes: VNodeProperties): VNodeProperties;
}

export interface Render {
	/**
	 * An array of strings that represent classes to be set on the widget.  If classes are present in the state, getting and
	 * setting classes is done on the state, otherwise they are shadowed on the instance.
	 */
	classes: string[];

	/**
	 * Returns the node attribute properties to be used by a render function
	 *
	 * @param overrides Any optional overrides of properties
	 */
	getNodeAttributes(overrides?: VNodeProperties): VNodeProperties;

	/**
	 * Returns any children VNodes that are part of the widget
	 */
	getChildrenNodes(): (VNode | string)[];

	/**
	 * The ID of the current widget
	 */
	readonly id: string;

	/**
	 * Invalidate the widget so that it will recalculate on its next render
	 */
	invalidate(): void;

	/**
	 * An array of node attribute functions which return additional attributes that should be mixed into
	 * the final VNode during a render call
	 */
	nodeAttributes: NodeAttributeFunction[];

	/**
	 * A reference to the widget's parent
	 */
	parent: Parent | null;

	/**
	 * Takes no arguments and returns a VNode
	 */
	render(): VNode;

	/**
	 * A has of styles that should be applied to root VNode of the widget.  If styles are present in the state, getting and
	 * setting classes is done on the state, otherwiser they are shadowed on the instance.
	 */
	styles: StylesHash;

	/**
	 * The tag name to be used
	 */
	tagName: string;
}

export type RenderMixin<S extends RenderMixinState> = Stateful<S> & Render;

export interface RenderMixinOptions<S extends RenderMixinState> extends StatefulOptions<S> {
	/**
	 * A render function to be used.
	 */
	render?: RenderFunction;

	/**
	 * Override the widget's tagName during construction
	 */
	tagName?: string;

	/**
	 * Set the widget's parent during construction
	 */
	parent?: Parent;
}

export interface RenderMixinFactory extends ComposeFactory<RenderMixin<RenderMixinState>, RenderMixinOptions<RenderMixinState>> {
	idBase: string;
}

/**
 * A map of dirty flags used when determining if the render function
 * should be called
 */
const dirtyMap = new Map<RenderMixin<RenderMixinState>, boolean>();

/**
 * A weak map of the rendered VNode to return when the widget is
 * not dirty.
 */
const renderCache = new WeakMap<RenderMixin<RenderMixinState>, VNode>();

/**
 * A weak map to shadow the classes for the widget
 */
const shadowClasses = new WeakMap<RenderMixin<RenderMixinState>, string[]>();

/**
 * A weak map to shadow the styles for the widget
 */
const shadowStyles = new WeakMap<RenderMixin<RenderMixinState>, StylesHash>();

/**
 * The counter for generating a unique ID
 */
let cachedRenderCount = 0;

/**
 * A function that generates an ID
 */
function generateID(cachedRender: RenderMixin<RenderMixinState>): string {
	const id = `${createRenderMixin.idBase}${++cachedRenderCount}`;
	cachedRender.setState({ id });
	return id;
}

/**
 * A weak map of the historic classes associated to a specific widget
 */
const widgetClassesMap = new WeakMap<RenderMixin<RenderMixinState>, string[]>();

const createRenderMixin = createStateful
	.mixin<Render, RenderMixinOptions<RenderMixinState>>({
		mixin: {
			get classes(this: RenderMixin<RenderMixinState>): string[] {
				return (this.state && this.state.classes) || shadowClasses.get(this);
			},

			set classes(this: RenderMixin<RenderMixinState>, value: string[]) {
				if (this.state.classes) {
					this.setState({ classes: value });
				}
				else {
					shadowClasses.set(this, value);
					this.invalidate();
				}
			},

			getNodeAttributes(this: RenderMixin<RenderMixinState>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this, assign({}, props));
					if (newProps) {
						assign(props, newProps);
					}
				});

				if (overrides) {
					assign(props, overrides);
				}
				return props;
			},

			getChildrenNodes(this: RenderMixin<RenderMixinState>): (VNode | string)[] {
				return this.state.label ? [ this.state.label ] : undefined;
			},

			get id(this: RenderMixin<RenderMixinState>): string {
				return (this.state && this.state.id) || generateID(this);
			},

			invalidate(this: RenderMixin<RenderMixinState>): void {
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

			nodeAttributes: [
				function (this: RenderMixin<RenderMixinState>): VNodeProperties {
					const props: VNodeProperties = this.state && this.state.id
						? { 'data-widget-id': this.state.id }
						: {};

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
					return props;
				}
			],

			parent: null,

			render(this: RenderMixin<RenderMixinState>): VNode {
				const cachedRender: RenderMixin<RenderMixinState> = this;
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

			get styles(this: RenderMixin<RenderMixinState>): StylesHash {
				return (this.state && this.state.styles) || shadowStyles.get(this);
			},

			set styles(this: RenderMixin<RenderMixinState>, value: StylesHash) {
				if (this.state.styles) {
					this.setState({ styles: value });
				}
				else {
					shadowStyles.set(this, value);
					this.invalidate();
				}
			},

			tagName: 'div'
		},
		initialize(instance, options = {}) {
			const { tagName, render, parent } = options;
			instance.tagName = tagName || instance.tagName;
			instance.render = render || instance.render;

			if (parent) {
				parent.append(instance);
			}

			dirtyMap.set(instance, true);

			instance.own(instance.on('statechange', () => instance.invalidate()));

			shadowClasses.set(instance, []);
			widgetClassesMap.set(instance, []);
		}
	})
	.static({
		idBase: 'widget'
	}) as RenderMixinFactory;

export default createRenderMixin;
