import { ComposeFactory } from 'dojo-compose/compose';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetState,
	WidgetOptions
} from './interfaces';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';

export type TagNameOrFactory<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>> = string | ComposeFactory<W, O>;

export type DOptions<S extends WidgetState, O extends WidgetOptions<S>> = VNodeProperties | O;

export type Children = (DNode | VNode | null)[];

function d(tagName: string, options: VNodeProperties, children?: Children): HNode;
function d(tagName: string, children: Children): HNode;
function d(tagName: string): HNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O, children: DNode[]): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	tagNameOrFactory: TagNameOrFactory<S, W, O>,
	optionsOrChildren: DOptions<S, O> = {},
	children: Children = []
): DNode {

	if (typeof tagNameOrFactory === 'string') {
		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		children = children.filter((child) => child);

		return {
			children: children,
			render(this: { children: VNode[] }) {
				return h(<string> tagNameOrFactory, <VNodeProperties> optionsOrChildren, this.children);
			}
		};
	}

	if (typeof tagNameOrFactory === 'function') {
		return {
			children: <DNode[]> children,
			factory: tagNameOrFactory,
			options: <WidgetOptions<WidgetState>> optionsOrChildren
		};
	}

	throw new Error('Unsupported tagName or factory type');
}

export default d;
