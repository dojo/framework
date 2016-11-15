import { ComposeFactory } from 'dojo-compose/compose';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetState,
	WidgetOptions
} from 'dojo-interfaces/widgetBases';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';

export type TagNameOrFactory<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>> = string | ComposeFactory<W, O>;

export type DOptions<S extends WidgetState, O extends WidgetOptions<S>> = VNodeProperties | O;

type Children = (DNode | VNode | null)[];

function d(tagName: string, options?: VNodeProperties, children?: (DNode | VNode | null)[]): HNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	tagNameOrFactory: TagNameOrFactory<S, W, O>,
	options: DOptions<S, O> = {},
	children: Children = []): DNode {

	if (typeof tagNameOrFactory === 'string') {
		children = children.filter((child) => child);

		return {
			children: children,
			render(this: { children: VNode[] }) {
				return h(<string> tagNameOrFactory, <VNodeProperties> options, this.children);
			}
		};
	}

	if (typeof tagNameOrFactory === 'function') {
		return {
			factory: tagNameOrFactory,
			options: <WidgetOptions<WidgetState>> options
		};
	}

	throw new Error('Unsupported tagName or factory type');
}

export default d;
