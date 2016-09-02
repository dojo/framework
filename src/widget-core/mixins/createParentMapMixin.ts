import { Map } from 'immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-shim/WeakMap';
import { Child, ChildListEvent, ChildrenMap } from './interfaces';
import { getRemoveHandle } from '../util/lang';

export interface ParentMapMixinOptions<C extends Child> {
	/**
	 * Children that are owned by the parent on creation
	 */
	children?: ChildrenMap<C>;
}

export interface ParentMap<C extends Child> {
	/**
	 * An immutable map of children associated with this parent
	 */
	children: Map<string, C>;

	/**
	 * Append a child (or an array of children) to this parent
	 *
	 * Appending will attempt to determine the child's ID and use that as the key in the
	 * children map.  If it cannot be determined, a unique ID will be generated
	 * @param child The child (or children) to append
	 */
	append(child: C | C[]): Handle;

	/**
	 * Clear all the children from this parent
	 */
	clear(): void;

	/**
	 * Merge a map of children with any existing children of this parent
	 * @param children The Map of the children
	 */
	merge(children: ChildrenMap<C>): Handle;

	on?(type: 'childlist', listener: EventedListener<ChildListEvent<this, C>>): Handle;
	on?(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type ParentMapMixin<C extends Child> = ParentMap<C> & Evented;

export interface ParentMapMixinFactory extends ComposeFactory<ParentMapMixin<Child>, ParentMapMixinOptions<Child>> { }

const childrenMap = new WeakMap<ParentMapMixin<Child>, Map<string, Child>>();

/**
 * Function that resolves the key for the children map for a given child
 * @param parent The parent that the child will be mapped to
 * @param child The child that is being mapped
 */
function getChildKey(parent: ParentMap<Child>, child: Child): string {
	return child.id || 'child' + parent.children.size;
}

/**
 * Function that converts an array of children into a map of children
 * @param parent The parent that the children will be mapped to
 * @param children An array of children to be mapped to the parent
 */
function mapChildArray<C extends Child>(parent: ParentMap<C>, children: C[]): ChildrenMap<C> {
	const childMap: ChildrenMap<C> = {};
	let keyCount = parent.children.size;
	/* TODO: in theory, if children are added, then removed and then added again, duplicate keys could
	 * be generated*/
	children.forEach((child) => childMap[child.id || 'child' + keyCount++] = child);
	return childMap;
}

const createParentMapMixin: ParentMapMixinFactory = compose<ParentMap<Child>, ParentMapMixinOptions<Child>>({
		get children(this: ParentMapMixin<Child> & { invalidate?(): void; }): Map<string, Child> {
			return childrenMap.get(this);
		},

		set children(this: ParentMapMixin<Child> & { invalidate?(): void; }, value: Map<string, Child>) {
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

		append(this: ParentMapMixin<Child>, child: Child | Child[]): Handle {
			this.children = Array.isArray(child) ?
				this.children.merge(mapChildArray(this, child)) :
				this.children.set(getChildKey(this, child), child);
			return getRemoveHandle<Child>(this, child);
		},

		merge(this: ParentMapMixin<Child>, children: ChildrenMap<Child>): Handle {
			this.children = this.children.merge(children);
			return getRemoveHandle(this, children);
		},

		clear(this: ParentMapMixin<Child>) {
			this.children = Map<string, Child>();
		}
	})
	.mixin({
		mixin: createEvented,
		initialize(instance, options) {
			childrenMap.set(instance, Map<string, Child>());
			if (options && options.children) {
				instance.own(instance.merge(options.children));
			}
			instance.own({
				destroy() {
					const children = childrenMap.get(instance);
					children.forEach((child) => child.destroy());
				}
			});
		}
	});

export default createParentMapMixin;
