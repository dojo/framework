import { h, VNode, VNodeProperties } from 'maquette/maquette';
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
			instance.own({
				destroy() {
					widgetClassesMap.delete(instance);
				}
			});
		}
	})
	.mixin({
		mixin: <CachedRender> {
			getNodeAttributes(overrides?: VNodeProperties): VNodeProperties {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				const props: VNodeProperties = cachedRender.state && cachedRender.state.id ? { 'data-widget-id': cachedRender.state.id } : {};
				for (let key in cachedRender.listeners) {
					props[key] = cachedRender.listeners[key];
				}
				const classes: { [index: string]: boolean; } = {};
				const widgetClasses = widgetClassesMap.get(cachedRender);

				widgetClasses.forEach((c) => classes[c] = false);

				if (cachedRender.classes) {
					cachedRender.classes.forEach((c) => classes[c] = true);
					widgetClassesMap.set(cachedRender, cachedRender.classes);
				}

				props.classes = classes;
				props.styles = cachedRender.styles || {};
				props.key = cachedRender;
				if (overrides) {
					assign(props, overrides);
				}
				return props;
			},

			getChildrenNodes(): (VNode | string)[] {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				return cachedRender.state.label ? [ cachedRender.state.label ] : undefined;
			},

			render(): VNode {
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

			invalidate(): void {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				if (dirtyMap.get(cachedRender)) { /* short circuit if already dirty */
					return;
				}
				const parent = cachedRender.parent;
				dirtyMap.set(cachedRender, true);
				renderCache.delete(cachedRender); /* Allow GC to occur on renderCache */
				if (parent && parent.invalidate) {
					parent.invalidate();
				}
			},

			get id(): string {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				return (cachedRender.state && cachedRender.state.id) || generateID(cachedRender);
			},

			get classes(): string[] {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				return (cachedRender.state && cachedRender.state.classes) || shadowClasses.get(cachedRender);
			},

			set classes(value: string[]) {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				if (cachedRender.state.classes) {
					cachedRender.setState({ classes: value });
				}
				else {
					shadowClasses.set(cachedRender, value);
					cachedRender.invalidate();
				}
			},

			get styles(): StylesHash {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				return (cachedRender.state && cachedRender.state.styles) || shadowStyles.get(cachedRender);
			},

			set styles(value: StylesHash) {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				if (cachedRender.state.styles) {
					cachedRender.setState({ styles: value });
				}
				else {
					shadowStyles.set(cachedRender, value);
					cachedRender.invalidate();
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
