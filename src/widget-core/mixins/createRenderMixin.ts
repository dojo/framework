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
	 * An array of strings that represent widget classes to be applied to all widget instances. Typically classes that
	 * represent the internal widget structure. Widget classes for all mixed in factories will be merged into a final
	 * array that is used by `getSelectorAndWidgetClasses` to return the readonly classes during the render.
	 */
	readonly classes: string[];

	/**
	 * Returns the node attribute properties to be used by a render function
	 *
	 * @param overrides Any optional overrides of properties
	 */
	getNodeAttributes(overrides?: VNodeProperties): VNodeProperties;

	/**
	 * Returns the widgets' selector and all `widgetClasses` defined, these are configured by adding classes to the
	 * `widgetClasses` array when extending widgets.
	 */
	getSelectorAndWidgetClasses(): string;

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

			getSelectorAndWidgetClasses(this: RenderMixin<RenderMixinState>): string {
				const selectorAndClasses = [this.tagName, ...this.classes];
				return selectorAndClasses.join('.');
			},

			getChildrenNodes(this: RenderMixin<RenderMixinState>): (VNode | string)[] {
				return this.state.label ? [ this.state.label ] : [];
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
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state;
					const classes: { [index: string]: boolean; } = {};
					const widgetClasses = widgetClassesMap.get(this);

					widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						widgetClassesMap.set(this, this.state.classes);
					}

					return assign(baseIdProp, { key: this, classes, styles });
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
					cached = h(cachedRender.getSelectorAndWidgetClasses() , cachedRender.getNodeAttributes(), cachedRender.getChildrenNodes());
					renderCache.set(cachedRender, cached);
					dirtyMap.set(cachedRender, false);
					return cached;
				}
			},

			classes: [],

			tagName: 'div'
		},
		initialize(instance: RenderMixin<RenderMixinState>, options: RenderMixinOptions<RenderMixinState> = {}) {
			const { tagName, render, parent } = options;
			instance.tagName = tagName || instance.tagName;
			instance.render = render || instance.render;

			if (parent) {
				parent.append(instance);
			}

			dirtyMap.set(instance, true);

			instance.own(instance.on('statechange', () => instance.invalidate()));

			widgetClassesMap.set(instance, []);
		}
	})
	.static({
		idBase: 'widget'
	}) as RenderMixinFactory;

export default createRenderMixin;
