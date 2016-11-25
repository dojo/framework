import { h, createProjector as createMaquetteProjector, Projector as MaquetteProjector, VNode, VNodeProperties } from 'maquette';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/bases/createEvented';
import global from 'dojo-core/global';
import { EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { EventedListener, EventedOptions, Evented } from 'dojo-interfaces/bases';
import { assign } from 'dojo-core/lang';
import { queueTask } from 'dojo-core/queue';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import createVNodeEvented, { VNodeEvented } from './mixins/createVNodeEvented';
import { Child, Parent, ChildrenMap } from './mixins/interfaces';
import { includes as arrayIncludes } from 'dojo-shim/array';

export type Position = number | 'first' | 'last' | 'before' | 'after';

export type AttachType = 'append' | 'merge' | 'replace';

export interface ProjectorOptions<C extends Child> extends EventedOptions {
	/**
	 * The root element for the projector
	 */
	root?: Element;

	/**
	 * If `true`, automatically attach to the DOM during creation (by merging). Do the same if a valid attach type is
	 * provided (see `AttachOptions`). The attach type determines how the projector is attached.
	 */
	autoAttach?: boolean | AttachType;

	/**
	 * If `true`, will configure the projector to support css transitions using `cssTransitions` global object.
	 * The projector will fail create if the options is true but the global object cannot be found.
	 */
	cssTransitions?: boolean;

	/**
	 * Children that are owned by the parent on creation
	 */
	children?: C[];
}

export interface AttachOptions {
	/**
	 * If `'append'` it will append to the root. If `'merge'` it will merge with the root. If `'replace'` it will
	 * replace the root.
	 */

	type?: AttachType;
	/**
	 * If `type` is `'append'` or `'replace'` then `tagName` will be used to determine what tag name
	 * is used to append to or replace the root element. Defaults to `div`.
	 */
	tagName?: string;
}

export interface ProjectorMixin<C extends Child> extends Parent {
	/**
	 * Get the projector's VNode attributes
	 */
	getNodeAttributes(overrides?: VNodeProperties): VNodeProperties;

	/**
	 * Returns a VNode which represents the DOM for the projector
	 */
	render(): VNode;

	/**
	 * Attach the projector to the DOM and return a promise.
	 *
	 * The promise is fulfilled when all previously appended children have been created.
	 * It is fulfilled with a handle which can be used to detach the projector. The same promise is
	 * returned when called more than once.
	 *
	 * @param options An optional map of options that change the default behaviour of the attachment
	 */
	attach(options?: AttachOptions): Promise<Handle>;

	/**
	 * Inform the projector that it is in a dirty state and should re-render.  Calling event handles will automatically
	 * schedule a re-render.
	 */
	invalidate(): void;

	/**
	 * If unattached, set the root element for the projector.
	 * @param root The Element that should serve as the root for the projector
	 */
	setRoot(root: Element): void;

	/**
	 * The native maquette Projector that is being managed
	 */
	projector: MaquetteProjector;

	/**
	 * The root of the projector
	 */
	root: Element;

	/**
	 * An array of classes that should be applied to the root of the projector
	 */
	classes?: string[];

	/**
	 * A hash of inline styles that should be applied to the root of the projector
	 */
	styles?: { [style: string]: string; };

	/**
	 * A reference to the document that the projector is attached to
	 */
	document: Document;

	/**
	 * The current state of the projector
	 */
	state: ProjectorState;

	/**
	 * An immutable list of children for this parent
	 */
	children: Child[];

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

export interface ProjectorOverrides<C extends Child> {
	/**
	 * Event emitted after the projector has been attached to the DOM.
	 */
	on(type: 'attach', listener: EventedListener<this, EventTargettedObject<this>>): Handle;

	on(type: string, listener: EventedListener<this, EventTargettedObject<this>>): Handle;
}

export type Projector<C extends Child> = VNodeEvented & Evented & ProjectorMixin<Child>;

export interface ProjectorFactory extends ComposeFactory<Projector<Child>, ProjectorOptions<Child>> { }

export enum ProjectorState {
	Attached = 1,
	Detached
};

interface ProjectorData {
	afterInitialCreate?: () => void;
	attachHandle: Handle;
	attachPromise?: Promise<Handle>;
	boundRender: () => VNode;
	projector: MaquetteProjector;
	root: Element;
	state: ProjectorState;
	tagName: string;
}

const projectorDataMap = new WeakMap<Projector<Child>, ProjectorData>();

const noopHandle = { destroy() { } };
const emptyVNode = h('div');
const noopVNode = function(): VNode { return emptyVNode; };

interface ProjectorAttributes {

	classes?: {
		[index: string]: boolean | null | undefined;
	};

	styles?: {
		[index: string]: string | null | undefined;
	};

	[index: string]: any;
}

export function arrayEquals<T, S>(from: any[], to: any[]): boolean {
	let result = true;
	if (!from || !to) {
		return false;
	}

	if (from.length !== to.length) {
		return false;
	}

	from.forEach((fromItem, index) => {
		if (Array.isArray(fromItem) && Array.isArray(to[index])) {
			if (!arrayEquals(fromItem, to[index])) {
				result = false;
				return;
			}
		}
		else if (fromItem !== to[index]) {
			result = false;
			return;
		}
	});

	return result;
}

function getIndex<T>(list: T[], item: T, position: Position, reference?: T): number {
	let idx: number;
	if (typeof position === 'number') {
		idx = position;
		const size = list.length;
		if (idx < 0 || idx > size) {
			throw new Error('position is out of range');
		}
	}
	else {
		switch (position) {
		case 'first':
			idx = 0;
			break;
		case 'last':
			idx = list.length;
			break;
		case 'before':
			idx = reference === undefined ? -1 : list.indexOf(reference);
			if (idx === -1) {
				throw new Error('reference not contained in this list');
			}
			break;
		case 'after':
			idx = reference === undefined ? 0 : list.indexOf(reference) + 1;
			if (idx === 0) {
				throw new Error('reference not contained in this list');
			}
			break;
		default:
			throw Error(`Invalid position "${position}"`);
		}
	}
	return idx;
}

export function insertInArray<T>(array: T[], item: T, position: Position, reference?: T): T[] {
	array.splice(getIndex(array, item, position, reference), 0, item);
	return array;
}

/**
 * A type guard that checks to see if the value is a Child
 * @param value the value to guard for
 */
export function isChild<C extends Child>(value: any): value is C {
	return value && typeof value === 'object' && typeof value.render === 'function';
}

/**
 * A utility function that generates a handle that destroys any children
 * @param parent The parent that the handle relates to
 * @param child The child (or array of children) that the handle relates to
 */
export function getRemoveHandle<C extends Child>(parent: Parent, child: C | C[] | ChildrenMap<C>): Handle {
	function getDestroyHandle(c: C): Handle {
		let destroyed = false;
		return c.own({
			destroy() {
				if (destroyed) {
					return;
				}
				const { children } = parent;

				if (Array.isArray(children)) {
					const childrenCopy = [ ...children ];
					if (arrayIncludes(childrenCopy, c)) {
						childrenCopy.splice(childrenCopy.lastIndexOf(c), 1);
						parent.children = childrenCopy;
					}
				}
				else {
					children.forEach((value, key) => {
						if (c === value) {
							children.delete(key);
						}
					});
					parent.children = children;
				}
				destroyed = true;
			}
		});
	}

	let destroyed = false;

	if (Array.isArray(child)) {
		const handles = child.map((c) => getDestroyHandle(c));
		return {
			destroy() {
				if (destroyed) {
					return;
				}
				handles.forEach(({ destroy }) => destroy());
				destroyed = true;
			}
		};
	}
	else if (isChild(child)) {
		const handle = getDestroyHandle(child);
		return {
			destroy() {
				handle.destroy();
			}
		};
	}
	else {
		const handles: Handle[] = [];
		child.forEach((value) => {
			handles.push(getDestroyHandle(value));
		});
		return {
			destroy() {
				if (destroyed) {
					return;
				}
				handles.forEach(({ destroy }) => destroy());
				destroyed = true;
			}
		};
	}
}

const childrenMap = new WeakMap<Projector<Child>, (Child & Evented)[]>();

export const createProjector: ProjectorFactory = compose<ProjectorMixin<Child>, ProjectorOptions<Child>>({
		getNodeAttributes(this: Projector<Child>, overrides?: VNodeProperties): VNodeProperties {
			/* TODO: This is the same logic as createCachedRenderMixin, merge somehow */
			const props: ProjectorAttributes  = {};
			for (let key in this.listeners) {
				props[key] = this.listeners[key];
			}
			const classes: { [index: string]: boolean; } = {};
			if (this.classes) {
				this.classes.forEach((c) => classes[c] = true);
			}
			props.classes = classes;
			props.styles = this.styles || {};
			if (overrides) {
				assign(props, overrides);
			}
			return props;
		},
		render(this: Projector<Child>): VNode {
			const projectorData = projectorDataMap.get(this);
			const childVNodes: VNode[] = [];
			this.children.forEach((child) => {
				// Workaround for https://github.com/facebook/immutable-js/pull/919
				// istanbul ignore else
				if (child) {
					childVNodes.push(child.render());
				}
			});
			const props = this.getNodeAttributes();
			props.afterCreate = projectorData.afterInitialCreate;
			return h(projectorData.tagName, props, childVNodes);
		},
		attach(this: Projector<Child>, { type, tagName }: AttachOptions = {}): Promise<Handle> {
			const projectorData = projectorDataMap.get(this);
			if (projectorData.state === ProjectorState.Attached) {
				return projectorData.attachPromise || Promise.resolve(noopHandle);
			}
			projectorData.boundRender = this.render.bind(this);
			if (tagName !== undefined) {
				projectorData.tagName = tagName;
			}
			projectorData.state = ProjectorState.Attached;
			projectorData.attachHandle = this.own({
				destroy() {
					if (projectorData.state === ProjectorState.Attached) {
						projectorData.projector.stop();
						try {
							/* Sometimes Maquette can't seem to find function */
							projectorData.projector.detach(projectorData.boundRender);
						}
						catch (e) {
							if (e.message !== 'renderMaquetteFunction was not found') {
								throw e;
							}
							/* else, swallow */
						}
						/* for some reason, Maquette still trys to call this in some situations, so the noopVNode is
						 * used to return an empty structure */
						projectorData.boundRender = noopVNode;
						projectorData.state = ProjectorState.Detached;
					}
					projectorData.attachHandle = noopHandle;
				}
			});
			projectorData.attachPromise = new Promise((resolve, reject) => {
				projectorData.afterInitialCreate = () => {
					try {
						this.emit({ type: 'attach' });
						resolve(projectorData.attachHandle);
					} catch (err) {
						reject(err);
					}
				};
			});

			/* attaching async, in order to help ensure that if there are any other async behaviours scheduled at the end of the
			 * turn, they are executed before this, since the attachement is actually done in turn, but subsequent schedule
			 * renders are done out of turn */
			queueTask(() => {
				const { projector } = projectorData;
				switch (type) {
					case 'append':
						projector.append(projectorData.root, projectorData.boundRender);
						break;
					case 'replace':
						projector.replace(projectorData.root, projectorData.boundRender);
						break;
					case 'merge':
					default:
						projector.merge(projectorData.root, projectorData.boundRender);
						break;
				}
			});

			return projectorData.attachPromise;
		},
		invalidate(this: Projector<Child>): void {
			const projectorData = projectorDataMap.get(this);
			if (projectorData.state === ProjectorState.Attached) {
				this.emit({
					type: 'schedulerender',
					target: this
				});
				projectorData.projector.scheduleRender();
			}
		},
		setRoot(this: Projector<Child>, root: Element): void {
			const projectorData = projectorDataMap.get(this);
			if (projectorData.state === ProjectorState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			projectorData.root = root;
		},

		get root(this: Projector<Child>): Element {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.root;
		},

		get projector(this: Projector<Child>): MaquetteProjector {
			return projectorDataMap.get(this).projector;
		},

		get document(this: Projector<Child>): Document {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.root && projectorData.root.ownerDocument;
		},

		get state(this: Projector<Child>): ProjectorState {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.state;
		},

		get children(this: Projector<Child>): (Child & Evented)[] {
			return childrenMap.get(this);
		},

		set children(this: Projector<Child>, value: (Child & Evented)[]) {
			if (!arrayEquals(value, childrenMap.get(this))) {
				value.forEach((widget) => {
					// Workaround for https://github.com/facebook/immutable-js/pull/919
					// istanbul ignore else
					if (widget) {
						widget.on('invalidated', () => {
							if (this.invalidate) {
								this.invalidate();
							}
						});
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

		append(this: Projector<Child>, child: Child[] | Child): Handle {
			this.children = Array.isArray(child) ? this.children.concat(child) : this.children.concat([child]);
			return getRemoveHandle<Child>(this, child);
		},

		clear(this: Projector<Child>): void {
			const children = childrenMap.get(this);
			if (children) {
				this.children = [];
			}
			this.invalidate();
		},

		insert(this: Projector<Child>, child: Child, position: Position, reference?: Child): Handle {
			this.children = insertInArray(childrenMap.get(this), child, position, reference);
			return getRemoveHandle(this, child);
		}
	},
	function initialize(instance: Projector<Child>, { cssTransitions = false, autoAttach = false, root = document.body }: ProjectorOptions<Child> = {}) {
		const options: { transitions?: any } = {};
		if (cssTransitions) {
			if (global.cssTransitions) {
				options.transitions = global.cssTransitions;
			}
			else {
				throw new Error('Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
			}
		}
		const projector = createMaquetteProjector(options);
		projectorDataMap.set(instance, {
			attachHandle: noopHandle,
			boundRender: noopVNode,
			projector,
			root,
			state: ProjectorState.Detached,
			tagName: 'div'
		});
		if (autoAttach === true) {
			instance.attach({ type: 'merge' });
		}
		else if (typeof autoAttach === 'string') {
			instance.attach({ type: autoAttach });
		}
	})
	.mixin({
		mixin: createVNodeEvented,
		initialize(instance) {
			/* We have to stub out listeners for Maquette, otherwise it won't allow us to change them down the road */
			instance.on('touchend', function () {});
			instance.on('touchmove', function () {});
		}
	})
	.mixin({
		mixin: createEvented,
		initialize(instance, options) {
			childrenMap.set(instance, []);
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

// Projectors cannot be created outside of browser environments. Ensure that a default projector can always be
// exported, even if it can't do anything.
const createStubbedProjector: ProjectorFactory = compose({
		getNodeAttributes(): VNodeProperties {
			throw new Error('Projector is stubbed');
		},
		render(): VNode {
			throw new Error('Projector is stubbed');
		},
		attach(): Promise<Handle> {
			throw new Error('Projector is stubbed');
		},
		invalidate() {
			throw new Error('Projector is stubbed');
		},
		setRoot(root: Element) {
			throw new Error('Projector is stubbed');
		},
		get projector(): MaquetteProjector {
			throw new Error('Projector is stubbed');
		},
		get root(): Element {
			throw new Error('Projector is stubbed');
		},
		get document(): Document {
			throw new Error('Projector is stubbed');
		},
		get state(): ProjectorState {
			throw new Error('Projector is stubbed');
		},
		get children(): (Child & Evented)[] {
			throw new Error('Projector is stubbed');
		},
		set children(child) {
			throw new Error('Projector is stubbed');
		},
		append(): Handle {
			throw new Error('Projector is stubbed');
		},
		clear(): void {
			throw new Error('Projector is stubbed');
		},
		insert(): Handle {
			throw new Error('Projector is stubbed');
		}
	})
	.mixin(createVNodeEvented);

const defaultProjector: Projector<Child> = typeof global.document === 'undefined' ?
	createStubbedProjector() :
	createProjector();

export default defaultProjector;
