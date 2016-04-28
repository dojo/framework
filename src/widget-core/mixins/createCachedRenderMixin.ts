import { h, VNode, VNodeProperties } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { State, Stateful, StateChangeEvent, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import { assign } from 'dojo-core/lang';
import Map from 'dojo-core/Map';
import WeakMap from 'dojo-core/WeakMap';
import { ParentMixin } from './createParentMixin';
import createRenderable, { Renderable } from './createRenderable';
import createVNodeEvented, { VNodeEvented } from './createVNodeEvented';

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

	classes?: string[];

	styles?: StylesHash;
}

export interface CachedRenderParent extends ParentMixin<any> {
	/**
	 * Invalidate the widget so that it will recalculate on its next render
	 */
	invalidate(): void;
}

export interface CachedRenderMixin<S extends CachedRenderState> extends Stateful<S>, Renderable, VNodeEvented {
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
	 * An array of strings that represent classes to be set on the widget.  If classes are present in the state, getting and
	 * setting classes is done on the state, otherwise they are shadowed on the instance.
	 */
	classes: string[];

	styles: StylesHash;

	parent?: CachedRenderParent;

	on(type: 'statechange', listener: EventedListener<StateChangeEvent<S>>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
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
 * A weak map to shadown the classes for the widget
 */
const shadowClasses = new WeakMap<CachedRenderMixin<CachedRenderState>, string[]>();

const shadowStyles = new WeakMap<CachedRenderMixin<CachedRenderState>, StylesHash>();

const createCachedRenderMixin: ComposeFactory<CachedRenderMixin<CachedRenderState>, StatefulOptions<CachedRenderState>> = createStateful
	.mixin(createRenderable)
	.mixin({
		mixin: {
			getNodeAttributes(overrides?: VNodeProperties): VNodeProperties {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				const props: VNodeProperties = cachedRender.state.id ? { id: cachedRender.state.id } : {};
				for (let key in cachedRender.listeners) {
					props[key] = cachedRender.listeners[key];
				}
				const classes: { [index: string]: boolean; } = {};
				if (cachedRender.classes) {
					cachedRender.classes.forEach((c) => classes[c] = true);
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

			get classes(): string[] {
				const cachedRender: CachedRenderMixin<CachedRenderState> = this;
				return cachedRender.state.classes || shadowClasses.get(cachedRender);
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
				return cachedRender.state.styles || shadowStyles.get(cachedRender);
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
			},

			parent: <CachedRenderParent> null
		},
		initialize(instance) {
			/* at this point, casting instance as the final type blows up the type inference, so the only choice is to
			 * cast as any */
			dirtyMap.set(<any> instance, true);
			shadowClasses.set(<any> instance, []);
		}
	})
	.mixin({
		mixin: createVNodeEvented,
		initialize(instance) {
			instance.own(instance.on('statechange', () => { instance.invalidate(); } ));
		}
	});

export default createCachedRenderMixin;
