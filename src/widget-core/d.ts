import { ComposeFactory } from 'dojo-compose/compose';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	Children,
	Widget,
	WidgetOptions,
	WidgetState
} from './interfaces';

export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O>,
	options: O
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O>,
	options: O,
	children?: Children
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O>,
	options: O,
	children: Children = []
): WNode {

	const filteredChildren = <(DNode)[]> children.filter((child) => child);

	return {
		children: filteredChildren,
		factory,
		options
	};
}

export function v(tag: string, options: VNodeProperties, children?: Children): HNode;
export function v(tag: string, children: Children): HNode;
export function v(tag: string): HNode;
export function v(tag: string, optionsOrChildren: VNodeProperties = {}, children: Children = []): HNode {

		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		const filteredChildren = <DNode[]> children.filter((child) => child);

		return {
			children: filteredChildren,
			render(this: { children: VNode[] }) {
				return h(tag, optionsOrChildren, this.children);
			}
		};
}
