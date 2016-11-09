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

export type TagNameOrFactory = string | ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>>;

export type DOptions = VNodeProperties | WidgetOptions<WidgetState>;

function d(tagName: string, options?: VNodeProperties, children?: (DNode | VNode)[]): HNode;
function d(factory: ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>>, options: WidgetOptions<WidgetState>): WNode;
function d(tagNameOrFactory: TagNameOrFactory, options: DOptions = {}, children: (DNode | VNode)[] = []): DNode {

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
