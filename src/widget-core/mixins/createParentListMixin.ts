import { List } from 'immutable/immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-core/WeakMap';
import { getRemoveHandle, insertInList, Position } from '../util/lang';
import { Child, ChildListEvent } from './interfaces';

export interface ParentListMixinOptions<C extends Child> {
	/**
	 * Children that are owned by the parent on creation
	 */
	children?: C[];
}

export interface ParentList<C extends Child> {
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

export type ParentListMixin<C extends Child> = ParentList<C> & Evented;

export interface ParentListMixinFactory extends ComposeFactory<ParentListMixin<Child>, ParentListMixinOptions<Child>> { }

/**
 * Contains a List of children per instance
 */
const childrenMap = new WeakMap<ParentListMixin<Child>, List<Child>>();

const createParentMixin: ParentListMixinFactory = compose<ParentList<Child>, ParentListMixinOptions<Child>>({
		get children(): List<Child> {
			return childrenMap.get(this);
		},

		set children(value: List<Child>) {
			const parent: ParentListMixin<Child> & { invalidate?(): void; } = this;
			if (!value.equals(childrenMap.get(parent))) {
				value.forEach((widget) => {
					if (widget.parent !== parent) {
						widget.parent = parent;
						/* TODO: If a child gets attached and reattached it may own multiple handles */
						getRemoveHandle(parent, widget);
					}
				});
				childrenMap.set(parent, value);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: value
				});
				if (parent.invalidate) {
					parent.invalidate();
				}
			}
		},

		append(child: Child | Child[]): Handle {
			const parent: ParentListMixin<Child> = this;
			parent.children = Array.isArray(child) ? <List<Child>> parent.children.concat(child) : parent.children.push(child);
			return getRemoveHandle(parent, child);
		},

		clear(): void {
			const parent: ParentListMixin<Child> = this;
			const children = childrenMap.get(parent);
			if (children) {
				children.forEach((child) => { child.parent === undefined; });
				parent.children = List<Child>();
			}
		},

		insert(child: Child, position: Position, reference?: Child): Handle {
			const parent: ParentListMixin<Child> = this;
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
