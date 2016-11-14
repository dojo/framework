import { ComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import {
	HNode,
	DNode,
	WNode,
	Widget,
	WidgetMixin,
	WidgetState,
	WidgetOptions
} from 'dojo-interfaces/widgetBases';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { Factory } from 'dojo-interfaces/core';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import d from './../util/d';

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {}

interface WidgetInternalState {
	readonly id?: string;
	dirty: boolean;
	widgetClasses: string[];
	cachedVNode?: VNode;
	historicChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
	currentChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
};

/**
 * Internal state map for widget instances
 */
const widgetInternalStateMap = new WeakMap<Widget<WidgetState>, WidgetInternalState>();

/**
 * The counter for generating a unique ID
 */
let widgetCount = 0;

function generateID(instance: Widget<WidgetState>): string {
	const id = `widget-${++widgetCount}`;
	instance.setState({ id });
	return id;
}

function isWNode(child: DNode): child is WNode {
	return child && (<WNode> child).factory !== undefined;
}

function dNodeToVNode(instance: Widget<WidgetState>, dNode: DNode): VNode {
	const internalState = widgetInternalStateMap.get(instance);
	let child: HNode | Widget<WidgetState>;
	if (isWNode(dNode)) {
		const { factory, options: { id, state } } = dNode;
		const childrenMapKey = id || factory;
		const cachedChild = internalState.historicChildrenMap.get(childrenMapKey);
		if (cachedChild) {
			child = cachedChild;
			if (state) {
				child.setState(state);
			}
		}
		else {
			child = factory(dNode.options);
			child.own(child.on('invalidated', () => {
				instance.invalidate();
			}));
			internalState.historicChildrenMap.set(childrenMapKey, child);
			instance.own(child);
		}
		if (!id && internalState.currentChildrenMap.has(factory)) {
			const errorMsg = 'must provide unique keys when using the same widget factory multiple times';
			console.error(errorMsg);
			instance.emit({ type: 'error', target: instance, error: new Error(errorMsg) });
		}
		internalState.currentChildrenMap.set(childrenMapKey, child);
	}
	else {
		child = dNode;
		if (child.children) {
			child.children = child.children.map((child: DNode) => dNodeToVNode(instance, child));
		}
	}
	return child.render();
}

function manageDetachedChildren(instance: Widget<WidgetState>): void {
	const internalState = widgetInternalStateMap.get(instance);

	internalState.historicChildrenMap.forEach((child, key) => {
		if (!internalState.currentChildrenMap.has(key)) {
			internalState.historicChildrenMap.delete(key);
			child.destroy();
		}
	});
	internalState.currentChildrenMap.clear();
}

function formatTagNameAndClasses(tagName: string, classes: string[]) {
	if (classes.length) {
		return `${tagName}.${classes.join('.')}`;
	}
	return tagName;
}

const createWidget: WidgetFactory = createStateful
	.mixin<WidgetMixin, WidgetOptions<WidgetState>>({
		mixin: {
			childNodeRenderers: [],

			classes: [],

			getChildrenNodes(this: Widget<WidgetState>): DNode[] {
				let childrenWrappers: DNode[] = [];

				this.childNodeRenderers.forEach((fn) => {
					const wrappers = fn.call(this);
					childrenWrappers = childrenWrappers.concat(wrappers);
				});

				return childrenWrappers;
			},

			getNodeAttributes(this: Widget<WidgetState>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this);
					if (newProps) {
						assign(props, newProps);
					}
				});

				return props;
			},

			invalidate(this: Widget<WidgetState>): void {
				const internalState = widgetInternalStateMap.get(this);
				internalState.dirty = true;
				this.emit({
					type: 'invalidated',
					target: this
				});
			},

			get id(this: Widget<WidgetState>): string {
				const { id } = widgetInternalStateMap.get(this);

				return id || (this.state && this.state.id) || generateID(this);
			},

			nodeAttributes: [
				function (this: Widget<WidgetState>): VNodeProperties {
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state;
					const classes: { [index: string]: boolean; } = {};

					const internalState = widgetInternalStateMap.get(this);

					internalState.widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						internalState.widgetClasses =  this.state.classes;
					}

					return assign(baseIdProp, { key: this, classes, styles });
				}

			],

			render(this: Widget<WidgetState>): VNode {
				const internalState = widgetInternalStateMap.get(this);
				if (internalState.dirty || !internalState.cachedVNode) {
					const dNode = d(formatTagNameAndClasses(this.tagName, this.classes),
									this.getNodeAttributes(),
									this.getChildrenNodes());

					const widget = dNodeToVNode(this, dNode);
					manageDetachedChildren(this);
					internalState.cachedVNode = widget;
					internalState.dirty = false;
				}
				return internalState.cachedVNode;
			},

			tagName: 'div'
		},
		initialize(instance: Widget<WidgetState>, options: WidgetOptions<WidgetState> = {}) {
			const { id, tagName } = options;
			instance.tagName = tagName || instance.tagName;

			widgetInternalStateMap.set(instance, {
				id,
				dirty: true,
				widgetClasses: [],
				historicChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>(),
				currentChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>()
			});

			instance.own(instance.on('state:changed', () => {
				instance.invalidate();
			}));
		}
	});

export default createWidget;
