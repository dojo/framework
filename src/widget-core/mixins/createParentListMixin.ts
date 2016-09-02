import { List } from 'immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-shim/WeakMap';
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
		get children(this: ParentListMixin<Child> & { invalidate?(): void; } ): List<Child> {
			return childrenMap.get(this);
		},

		set children(this: ParentListMixin<Child> & { invalidate?(): void; }, value: List<Child>) {
			if (!value.equals(childrenMap.get(this))) {
				value.forEach((widget) => {
					if (widget.parent !== this) {
						widget.parent = this;
						/* TODO: If a child gets attached and reattached it may own multiple handles */
						getRemoveHandle(this, widget);
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

		append(this: ParentListMixin<Child>, child: Child | Child[]): Handle {
			this.children = Array.isArray(child) ? <List<Child>> this.children.concat(child) : this.children.push(child);
			return getRemoveHandle<Child>(this, child);
		},

		clear(this: ParentListMixin<Child>): void {
			const children = childrenMap.get(this);
			if (children) {
				children.forEach((child) => { child.parent === undefined; });
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
					children.forEach((child) => child.destroy());
				}
			});
		}
	});

export default createParentMixin;
