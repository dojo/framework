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
	WidgetState
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export const registry = new FactoryRegistry();

export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O,
	children?: DNode[]
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O,
	children: DNode[] = []
): WNode {

	return {
		children,
		factory,
		options
	};
}

export function v(tag: string, options: VNodeProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, optionsOrChildren: VNodeProperties = {}, children: DNode[] = []): HNode {

		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		return {
			children,
			render<T>(this: { children: VNode[] }, options: { bind?: T } = { }) {
				return h(tag, assign(options, optionsOrChildren), this.children);
			}
		};
}
