import { Handle } from 'dojo-core/interfaces';
import { List, Map } from 'immutable';
import { Renderable } from './createRenderable';

export type Child = Renderable & { id?: string };

export interface ChildrenMap<C extends Child> {
	[key: string]: C;
}

export interface ChildListEvent<T, C extends Child> {
	children: Map<string, C> | List<C>;
	target: T;
	type: 'childlist';
}

export interface Parent {
	children: Map<string, Child> | List<Child>;
	append(child: Child | Child[]): Handle;
}
