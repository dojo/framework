import { List } from 'immutable/immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-core/WeakMap';
import { Position, insertInList } from '../util/lang';
import { Renderable } from './createRenderable';

export interface ParentMixinOptions<C extends Child> {
	/**
	 * Children that are owned by the parent on creation
	 */
	children?: C[];
}

export type Child = Renderable;

export interface ChildListEvent<T extends Parent<C>, C extends Child> {
	type: 'childlist';
	target: T;
	children: List<C>;
}

export interface Parent<C extends Child> {
	/**
	 * An immutable list of children for this parent
	 */
	children: List<C>;

	/**
	 * Append a child (or children) to the parent
	 * @param child The child to append
	 */
	append(child: C): Handle;
	/**
	 * Append a child (or children) to the parent
	 * @param children The children to append
	 */
	append(children: C[]): Handle;

	/**
	 * Remove all children (but don't destory them)
	 */
	clear(): void;

	/**
	 * Insert a child in a specific position, providing the reference if required
	 * @param child The child to insert
	 * @param position The position to insert the child
	 * @param reference The referencable child, if required
	 */
	insert(child: C, position: Position, reference?: C): Handle;

	on?(type: 'childlist', listener: EventedListener<ChildListEvent<this, C>>): Handle;
	on?(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type ParentMixin<C extends Child> = Parent<C> & Evented;

export interface ParentMixinFactory extends ComposeFactory<ParentMixin<Child>, ParentMixinOptions<Child>> { }

/**
 * Contains a List of children per instance
 */
const childrenMap = new WeakMap<ParentMixin<Child>, List<Child>>();

/**
 * A utility function that generates a handle that destroys any children
 */
function getRemoveHandle(parent: ParentMixin<Child>, child: Child | Child[]): Handle {
	function getDestroyHandle(c: Child): Handle {
		let destroyed = false;
		return c.own({
			destroy() {
				if (destroyed) {
					return;
				}
				const idx = parent.children.lastIndexOf(c);
				if (idx > -1) {
					parent.children = parent.children.delete(idx);
				}
				destroyed = true;
				if (c.parent === parent) {
					c.parent = undefined;
				}
			}
		});
	}

	if (Array.isArray(child)) {
		let destroyed = false;
		const handles = child.map((c) => getDestroyHandle(c));
		return {
			destroy() {
				if (destroyed) {
					return;
				}
				handles.forEach((handle) => handle.destroy());
				destroyed = true;
			}
		};
	}
	else {
		const handle = getDestroyHandle(child);
		return {
			destroy() {
				handle.destroy();
			}
		};
	}
}

const createParentMixin: ParentMixinFactory = compose<Parent<Child>, ParentMixinOptions<Child>>({
		get children(): List<Child> {
			return childrenMap.get(this);
		},

		set children(value: List<Child>) {
			const parent: ParentMixin<Child> = this;
			if (!value.equals(childrenMap.get(parent))) {
				childrenMap.set(parent, value);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: value
				});
			}
		},

		append(child: Child | Child[]): Handle {
			const parent: ParentMixin<Child> = this;
			if (Array.isArray(child)) {
				child.forEach((c) => c.parent = parent);
				parent.children = <List<Child>> parent.children.concat(child);
			}
			else {
				child.parent = parent;
				parent.children = parent.children.push(child);
			}
			return getRemoveHandle(parent, child);
		},

		clear(): void {
			const parent: ParentMixin<Child> = this;
			const children = childrenMap.get(parent);
			if (children) {
				children.forEach((child) => { child.parent === undefined; });
				parent.children = List<Child>();
			}
		},

		insert(child: Child, position: Position, reference?: Child): Handle {
			const parent: ParentMixin<Child> = this;
			child.parent = parent;
			parent.children = insertInList(childrenMap.get(parent), child, position, reference);
			return getRemoveHandle(parent, child);
		}
	})
	.mixin({
		mixin: createEvented,
		initialize(instance, options) {
			childrenMap.set(instance, List<any>());
			if (options && options.children && options.children.length) {
				instance.own(instance.append(options.children));
			}
			instance.own({
				destroy() {
					const children = childrenMap.get(instance);
					children.forEach((child) => child.destroy());
					childrenMap.delete(instance);
				}
			});
		}
	});

export default createParentMixin;
