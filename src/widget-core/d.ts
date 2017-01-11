import { ComposeFactory } from 'dojo-compose/compose';
import { assign } from 'dojo-core/lang';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetOptions,
	WidgetState,
	WidgetProperties
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export const registry = new FactoryRegistry();

export function w<P extends WidgetProperties, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	properties: P
): WNode;
export function w<P extends WidgetProperties, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	properties: P,
	children?: DNode[]
): WNode;
export function w<P extends WidgetProperties, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	properties: P,
	children: DNode[] = []
): WNode {

	return {
		children,
		factory,
		properties
	};
}

export function v(tag: string, properties: VNodeProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VNodeProperties = {}, children: DNode[] = []): HNode {

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			propertiesOrChildren = {};
		}

		return {
			children,
			render<T>(this: { children: VNode[] }, options: { bind?: T } = { }) {
				return h(tag, assign(options, propertiesOrChildren), this.children);
			}
		};
}
