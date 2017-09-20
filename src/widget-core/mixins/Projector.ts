import { assign } from '@dojo/core/lang';
import global from '@dojo/shim/global';
import { createHandle } from '@dojo/core/lang';
import { Handle } from '@dojo/interfaces/core';
import { Evented } from '@dojo/core/Evented';
import { VNode } from '@dojo/interfaces/vdom';
import { ProjectionOptions } from '../interfaces';
import { dom, h, Projection } from 'maquette';
import 'pepjs';
import cssTransitions from '../animations/cssTransitions';
import { Constructor, DNode } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { Registry } from './../Registry';
import eventHandlerInterceptor from '../util/eventHandlerInterceptor';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
}

export interface AttachOptions {

	/**
	 * If `'append'` it will appended to the root. If `'merge'` it will merged with the root. If `'replace'` it will
	 * replace the root.
	 */
	type: AttachType;

	/**
	 * Element to attach the projector.
	 */
	root?: Element;
}

export interface ProjectorProperties {
	registry?: Registry;
}

export interface ProjectorMixin<P> {

	readonly properties: Readonly<P> & Readonly<ProjectorProperties>;

	/**
	 * Append the projector to the root.
	 */
	append(root?: Element): Handle;

	/**
	 * Merge the projector onto the root.
	 *
	 * The `root` and any of its `children` will be re-used.  Any excess DOM nodes will be ignored and any missing DOM nodes
	 * will be created.
	 * @param root The root element that the root virtual DOM node will be merged with.  Defaults to `document.body`.
	 */
	merge(root?: Element): Handle;

	/**
	 * Replace the root with the projector node.
	 */
	replace(root?: Element): Handle;

	/**
	 * Pause the projector.
	 */
	pause(): void;

	/**
	 * Resume the projector.
	 */
	resume(): void;

	/**
	 * Attach the project to a _sandboxed_ document fragment that is not part of the DOM.
	 *
	 * When sandboxed, the `Projector` will run in a sync manner, where renders are completed within the same turn.
	 * The `Projector` creates a `DocumentFragment` which replaces any other `root` that has been set.
	 * @param doc The `Document` to use, which defaults to the global `document`.
	 */
	sandbox(doc?: Document): Handle;

	/**
	 * Schedule a render.
	 */
	scheduleRender(): void;

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	setProperties(properties: this['properties']): void;

	/**
	 * Sets the widget's children
	 */
	setChildren(children: DNode[]): void;

	/**
	 * Return a `string` that represents the HTML of the current projection.  The projector needs to be attached.
	 */
	toHtml(): string;

	/**
	 * Indicates if the projectors is in async mode, configured to `true` by defaults.
	 */
	async: boolean;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;
}

/**
 * Internal function that maps existing DOM Elements to virtual DOM nodes.
 *
 * The function does not presume DOM will be there.  It does assume that if a DOM `Element` exists that the `VNode`s are in
 * the same DOM order as the `Element`s.  If a DOM Element does not exist, it will set the `vnode.domNode` to `null` and
 * not descend further into the `VNode` children which will cause the maquette projection to create the Element anew.
 * @param vnode The virtual DOM node
 * @param domNode The Element, if any, to set on the virtual DOM node
 */
function setDomNodes(vnode: VNode, domNode: Element | null = null) {
	vnode.domNode = domNode;
	if (vnode.children && domNode) {
		vnode.children.forEach((child, i) => setDomNodes(child, domNode.children[i]));
	}
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(Base: T): T & Constructor<ProjectorMixin<P>> {
	class Projector extends Base {

		public projectorState: ProjectorAttachState;
		public properties: Readonly<P> & Readonly<ProjectorProperties>;

		private _root: Element;
		private _async = true;
		private _attachHandle: Handle;
		private _projectionOptions: ProjectionOptions;
		private _projection: Projection | undefined;
		private _scheduled: number | undefined;
		private _paused: boolean;
		private _boundDoRender: () => void;
		private _boundRender: Function;
		private _projectorChildren: DNode[];
		private _projectorProperties: this['properties'];
		private _rootTagName: string;
		private _attachType: AttachType;

		constructor(...args: any[]) {
			super(...args);

			const nodeEvent = new Evented();
			this.own(nodeEvent);

			this._projectionOptions = {
				transitions: cssTransitions,
				eventHandlerInterceptor: eventHandlerInterceptor.bind(this),
				nodeEvent
			};

			this._boundDoRender = this._doRender.bind(this);
			this._boundRender = this.__render__.bind(this);
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = document.body;
			this.projectorState = ProjectorAttachState.Detached;
		}

		public append(root?: Element) {
			const options = {
				type: AttachType.Append,
				root
			};

			return this._attach(options);
		}

		public merge(root?: Element) {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this._attach(options);
		}

		public replace(root?: Element) {
			const options = {
				type: AttachType.Replace,
				root
			};

			return this._attach(options);
		}

		public pause() {
			if (this._scheduled) {
				global.cancelAnimationFrame(this._scheduled);
				this._scheduled = undefined;
			}
			this._paused = true;
		}

		public resume() {
			this._paused = false;
			this.scheduleRender();
		}

		public scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached && !this._scheduled && !this._paused) {
				if (this._async) {
					this._scheduled = global.requestAnimationFrame(this._boundDoRender);
				}
				else {
					this._boundDoRender();
				}
			}
		}

		public set root(root: Element) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		public get root(): Element {
			return this._root;
		}

		public get async(): boolean {
			return this._async;
		}

		public set async(async: boolean) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change async mode');
			}
			this._async = async;
		}

		public sandbox(doc: Document = document): Handle {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot create sandbox');
			}
			this._async = false;
			const previousRoot = this.root;

			/* free up the document fragment for GC */
			this.own(createHandle(() => {
				this._root = previousRoot;
			}));
			return this._attach({
				/* DocumentFragment is not assignable to Element, but provides everything needed to work */
				root: doc.createDocumentFragment() as any,
				type: AttachType.Append
			});
		}

		public setChildren(children: DNode[]): void {
			this._projectorChildren = [ ...children ];
			super.__setChildren__(children);
		}

		public setProperties(properties: this['properties']): void {
			if (this._projectorProperties && this._projectorProperties.registry !== properties.registry) {
				if (this._projectorProperties.registry) {
					this._projectorProperties.registry.destroy();
				}
				if (properties.registry) {
					this.own(properties.registry);
				}
			}
			this._projectorProperties = assign({}, properties);
			super.__setCoreProperties__({ bind: this, baseRegistry: properties.registry });
			super.__setProperties__(properties);
		}

		public toHtml(): string {
			if (this.projectorState !== ProjectorAttachState.Attached || !this._projection) {
				throw new Error('Projector is not attached, cannot return an HTML string of projection.');
			}
			return this._projection.domNode.outerHTML;
		}

		public __render__(): VNode {
			if (this._projectorChildren) {
				this.setChildren(this._projectorChildren);
			}
			if (this._projectorProperties) {
				this.setProperties(this._projectorProperties);
			}
			let result = super.__render__();

			if (Array.isArray(result) || typeof result === 'string' || result === null || result === undefined) {
				if (!this._rootTagName) {
					this._rootTagName = 'span';
				}

				result = h(this._rootTagName, {}, result);
			}
			else if (!this._rootTagName) {
				this._rootTagName = result.vnodeSelector;
			}

			if (this._rootTagName !== result.vnodeSelector) {
				if (this._attachType === AttachType.Merge) {
					assign(result, { vnodeSelector: this._rootTagName });
				}
				else {
					result = h(this._rootTagName, {}, result);
				}
			}
			return result;
		}

		protected invalidate(): void {
			super.invalidate();
			this.scheduleRender();
		}

		private _doRender() {
			this._scheduled = undefined;

			if (this._projection) {
				this._projection.update(this._boundRender());
				this._projectionOptions.nodeEvent.emit({ type: 'rendered' });
			}
		}

		private _attach({ type, root }: AttachOptions): Handle {
			this._attachType = type;
			if (root) {
				this.root = root;
			}

			if (this.projectorState === ProjectorAttachState.Attached) {
				return this._attachHandle;
			}

			this.projectorState = ProjectorAttachState.Attached;

			this._attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorAttachState.Attached) {
						this.pause();
						this._projection = undefined;
						this.projectorState = ProjectorAttachState.Detached;
					}
					this._attachHandle = { destroy() { } };
				}
			});

			switch (type) {
				case AttachType.Append:
					this._projection = dom.append(this.root, this._boundRender(), this._projectionOptions);
				break;
				case AttachType.Merge:
					this._rootTagName = this._root.tagName.toLowerCase();
					const vnode: VNode = this._boundRender();
					setDomNodes(vnode, this.root);
					this._projection = dom.merge(this.root, vnode, this._projectionOptions);
				break;
				case AttachType.Replace:
					this._projection = dom.replace(this.root, this._boundRender(), this._projectionOptions);
				break;
			}

			this._projectionOptions.nodeEvent.emit({ type: 'rendered' });

			return this._attachHandle;
		}
	}

	return Projector;
}

export default ProjectorMixin;
