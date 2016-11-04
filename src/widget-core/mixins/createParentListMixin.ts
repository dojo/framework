import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/bases/createEvented';
import { EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { Evented, EventedListener } from 'dojo-interfaces/bases';
import WeakMap from 'dojo-shim/WeakMap';
import { List } from 'immutable';
import { getRemoveHandle, insertInList, Position } from '../util/lang';
import { Parent, Child, ChildListEvent } from './interfaces';

export interface ParentListMixinOptions<C extends Child> {
	/**
	 * Children that are owned by the parent on creation
	 */
	children?: C[];
}

export interface ParentList<C extends Child> extends Parent {
	/**
	 * An immutable list of children for this parent
	 */
	children: List<Child>;

	/**
	 * Remove all children (but don't destory them)
	 */
	clear(): void;

	/**
	 * Insert a child in a specific position, providing the reference if required
	 *
	 * @param child The child to insert
	 * @param position The position to insert the child
	 * @param reference The referencable child, if required
	 */
	insert(child: C, position: Position, reference?: C): Handle;
}

export interface ParentListOverloads<C extends Child> {
	/**
	 * Listen for events emitted from a parent when its children are mutated
	 */
	on(type: 'childlist', listener: EventedListener<this, ChildListEvent<this, C>>): Handle;
	on(type: string, listener: EventedListener<this, EventTargettedObject<this>>): Handle;
}

export type ParentListMixin<C extends Child> = ParentList<C> & Evented & ParentListOverloads<C>;

export interface ParentListMixinFactory extends ComposeFactory<ParentListMixin<Child>, ParentListMixinOptions<Child>> { }

/**
 * Contains a List of children per instance
 */
const childrenMap = new WeakMap<ParentListMixin<Child>, List<Child>>();

const createParentMixin: ParentListMixinFactory = compose<ParentList<Child>, ParentListMixinOptions<Child>>({
		get children(this: ParentListMixin<Child>): List<Child> {
			return childrenMap.get(this);
		},

		set children(this: ParentListMixin<Child>, value: List<Child>) {
			if (!value.equals(childrenMap.get(this))) {
				value.forEach((widget) => {
					// Workaround for https://github.com/facebook/immutable-js/pull/919
					// istanbul ignore else
					if (widget) {
						if (widget.parent !== this) {
							widget.parent = this;
							/* TODO: If a child gets attached and reattached it may own multiple handles */
							getRemoveHandle(this, widget);
						}
					}
				});
				childrenMap.set(this, value);
				this.emit({
					type: 'childlist',
					target: this,
					children: value
				});
				if (this.invalidate) {
					this.invalidate();
				}
			}
		},

		append(this: ParentListMixin<Child>, child: Child[] | Child): Handle {
			this.children = Array.isArray(child) ? <List<Child>> this.children.concat(child) : this.children.push(child);
			return getRemoveHandle<Child>(this, child);
		},

		clear(this: ParentListMixin<Child>): void {
			const children = childrenMap.get(this);
			if (children) {
				children.forEach((child) => {
					// Workaround for https://github.com/facebook/immutable-js/pull/919
					// istanbul ignore else
					if (child) {
						child.parent === undefined;
					}
				});
				this.children = List<Child>();
			}
		},

		insert(this: ParentListMixin<Child>, child: Child, position: Position, reference?: Child): Handle {
			child.parent = this;
			this.children = insertInList(childrenMap.get(this), child, position, reference);
			return getRemoveHandle(this, child);
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
					children.forEach((child) => {
						// Workaround for https://github.com/facebook/immutable-js/pull/919
						// istanbul ignore else
						if (child) {
							child.destroy();
						}
					});
				}
			});
		}
	});

export default createParentMixin;
