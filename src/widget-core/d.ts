import { assign } from '@dojo/core/lang';
import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetProperties,
	WidgetFactory
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export const registry = new FactoryRegistry();

export function w<P extends WidgetProperties>(factory: WidgetFactory<Widget<P>, P> | string, properties: P): WNode;
export function w<P extends WidgetProperties>(factory: WidgetFactory<Widget<P>, P> | string, properties: P, children?: DNode[]): WNode;
export function w<P extends WidgetProperties>(factory: WidgetFactory<Widget<P>, P> | string, properties: P, children: DNode[] = []): WNode {

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
