import { assign } from '@dojo/core/lang';
import { createHandle } from '@dojo/core/lang';
import { Handle } from '@dojo/core/interfaces';
import cssTransitions from '../animations/cssTransitions';
import { Constructor, DNode, Projection, ProjectionOptions } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { afterRender } from './../decorators/afterRender';
import { v } from './../d';
import { Registry } from './../Registry';
import { dom } from './../vdom';
import 'pepjs';

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
	Merge = 2
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
	 * Attach the project to a _sandboxed_ document fragment that is not part of the DOM.
	 *
	 * When sandboxed, the `Projector` will run in a sync manner, where renders are completed within the same turn.
	 * The `Projector` creates a `DocumentFragment` which replaces any other `root` that has been set.
	 * @param doc The `Document` to use, which defaults to the global `document`.
	 */
	sandbox(doc?: Document): void;

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

	/**
	 * Runs registered destroy handles
	 */
	destroy(): void;
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(Base: T): T & Constructor<ProjectorMixin<P>> {
	class Projector extends Base {
		public projectorState: ProjectorAttachState;
		public properties: Readonly<P> & Readonly<ProjectorProperties>;

		private _root: Element;
		private _async = true;
		private _attachHandle: Handle;
		private _projectionOptions: Partial<ProjectionOptions>;
		private _projection: Projection | undefined;
		private _projectorProperties: this['properties'] = {} as this['properties'];
		private _handles: Function[] = [];

		constructor(...args: any[]) {
			super(...args);

			this._projectionOptions = {
				transitions: cssTransitions
			};

			this.root = document.body;
			this.projectorState = ProjectorAttachState.Detached;
		}

		public append(root?: Element): Handle {
			const options = {
				type: AttachType.Append,
				root
			};

			return this._attach(options);
		}

		public merge(root?: Element): Handle {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this._attach(options);
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

		public sandbox(doc: Document = document): void {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot create sandbox');
			}
			this._async = false;
			const previousRoot = this.root;

			/* free up the document fragment for GC */
			this.own(() => {
				this._root = previousRoot;
			});

			this._attach({
				/* DocumentFragment is not assignable to Element, but provides everything needed to work */
				root: doc.createDocumentFragment() as any,
				type: AttachType.Append
			});
		}

		public setChildren(children: DNode[]): void {
			this.__setChildren__(children);
		}

		public setProperties(properties: this['properties']): void {
			this.__setProperties__(properties);
		}

		public __setProperties__(properties: this['properties']): void {
			if (this._projectorProperties && this._projectorProperties.registry !== properties.registry) {
				if (this._projectorProperties.registry) {
					this._projectorProperties.registry.destroy();
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
			return (this._projection.domNode.childNodes[0] as Element).outerHTML;
		}

		@afterRender()
		public afterRender(result: DNode) {
			let node = result;
			if (typeof result === 'string' || result === null || result === undefined) {
				node = v('span', {}, [result]);
			}

			return node;
		}

		private own(handle: Function): void {
			this._handles.push(handle);
		}

		public destroy() {
			while (this._handles.length > 0) {
				const handle = this._handles.pop();
				if (handle) {
					handle();
				}
			}
		}

		private _attach({ type, root }: AttachOptions): Handle {
			if (root) {
				this.root = root;
			}

			if (this.projectorState === ProjectorAttachState.Attached) {
				return this._attachHandle;
			}

			this.projectorState = ProjectorAttachState.Attached;

			const handle = () => {
				if (this.projectorState === ProjectorAttachState.Attached) {
					this._projection = undefined;
					this.projectorState = ProjectorAttachState.Detached;
				}
			};

			this.own(handle);
			this._attachHandle = createHandle(handle);

			this._projectionOptions = { ...this._projectionOptions, ...{ sync: !this._async } };

			switch (type) {
				case AttachType.Append:
					this._projection = dom.append(this.root, this, this._projectionOptions);
					break;
				case AttachType.Merge:
					this._projection = dom.merge(this.root, this, this._projectionOptions);
					break;
			}

			return this._attachHandle;
		}
	}

	return Projector;
}

export default ProjectorMixin;
