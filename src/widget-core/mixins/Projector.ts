import global from '@dojo/core/global';
import { Handle } from '@dojo/interfaces/core';
import { dom, Projection, ProjectionOptions, VNodeProperties } from 'maquette';
import 'pepjs';
import cssTransitions from '../animations/cssTransitions';
import { Constructor, WidgetProperties } from './../interfaces';
import { WidgetBase } from './../WidgetBase';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
};

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
};

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

export interface ProjectorMixin {

	/**
	 * Append the projector to the root.
	 */
	append(root?: Element): Handle;

	/**
	 * Merge the projector onto the root.
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
	 * Schedule a render.
	 */
	scheduleRender(): void;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;
}

const eventHandlers = [
	'ontouchcancel',
	'ontouchend',
	'ontouchmove',
	'ontouchstart',
	'onblur',
	'onchange',
	'onclick',
	'ondblclick',
	'onfocus',
	'oninput',
	'onkeydown',
	'onkeypress',
	'onkeyup',
	'onload',
	'onmousedown',
	'onmouseenter',
	'onmouseleave',
	'onmousemove',
	'onmouseout',
	'onmouseover',
	'onmouseup',
	'onmousewheel',
	'onscroll',
	'onsubmit'
];

export function ProjectorMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T): T & Constructor<ProjectorMixin> {
	return class extends base {

		public projectorState: ProjectorAttachState;

		private _root: Element;
		private _attachHandle: Handle;
		private _projectionOptions: ProjectionOptions;
		private _projection: Projection | undefined;
		private _scheduled: number | undefined;
		private _paused: boolean;
		private _boundDoRender: FrameRequestCallback;
		private _boundRender: Function;

		constructor(...args: any[]) {
			super(...args);

			this._projectionOptions = {
				transitions: cssTransitions,
				eventHandlerInterceptor: this.eventHandlerInterceptor.bind(this)
			};

			this._boundDoRender = this.doRender.bind(this);
			this._boundRender = this.__render__.bind(this);

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('properties:changed', this.invalidate));
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = document.body;
			this.projectorState = ProjectorAttachState.Detached;
		}

		public append(root?: Element) {
			const options = {
				type: AttachType.Append,
				root
			};

			return this.attach(options);
		}

		public merge(root?: Element) {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this.attach(options);
		}

		public replace(root?: Element) {
			const options = {
				type: AttachType.Replace,
				root
			};

			return this.attach(options);
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
				this._scheduled = global.requestAnimationFrame(this._boundDoRender);
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

		public __render__() {
			const result = super.__render__();
			if (typeof result === 'string' || result === null) {
				throw new Error('Must provide a VNode at the root of a projector');
			}

			return result;
		}

		private eventHandlerInterceptor(propertyName: string, eventHandler: Function, domNode: Element, properties: VNodeProperties) {
			if (eventHandlers.indexOf(propertyName) > -1) {
				return function(this: Node, ...args: any[]) {
					return eventHandler.apply(properties.bind || this, args);
				};
			}
			else {
				// remove "on" from event name
				const eventName = propertyName.substr(2);
				domNode.addEventListener(eventName, (...args: any[]) => {
					eventHandler.apply(properties.bind || this, args);
				});
			}
		}

		private doRender() {
			this._scheduled = undefined;

			if (this._projection) {
				this._projection.update(this._boundRender());
			}
		}

		private attach({ type, root }: AttachOptions): Handle {
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
					this._projection = dom.merge(this.root, this._boundRender(), this._projectionOptions);
				break;
				case AttachType.Replace:
					this._projection = dom.replace(this.root, this._boundRender(), this._projectionOptions);
				break;
			}

			return this._attachHandle;
		}
	};
}

export default ProjectorMixin;
