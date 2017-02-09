import Promise from '@dojo/shim/Promise';
import { createProjector as createMaquetteProjector, Projector as MaquetteProjector } from 'maquette';
import { EventTargettedObject, Handle } from '@dojo/interfaces/core';
import { WidgetConstructor, WidgetProperties } from './../WidgetBase';
import { Constructor } from './../interfaces';
import cssTransitions from '../animations/cssTransitions';

/**
 * Represents the state of the projector
 */
export enum ProjectorState {
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
	 * If `'append'` it will append to the root. If `'merge'` it will merge with the root. If `'replace'` it will
	 * replace the root.
	 */
	type: AttachType;
}

export interface ProjectorProperties extends WidgetProperties {

	root?: Element;
}

export interface Projector {

	/**
	 * Append the projector to the root.
	 */
	append(): Promise<Handle>;

	/**
	 * Merge the projector onto the root.
	 */
	merge(): Promise<Handle>;

	/**
	 * Replace the root with the projector node.
	 */
	replace(): Promise<Handle>;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorState;
}

export function ProjectorMixin<T extends WidgetConstructor>(base: T): T & Constructor<Projector> {
	return class extends base {

		public properties: ProjectorProperties;
		public projectorState: ProjectorState;
		private readonly projector: MaquetteProjector;

		private _root: Element;
		private attachPromise: Promise<Handle>;
		private attachHandle: Handle;
		private afterCreate: () => void;

		constructor(...args: any[]) {
			super(...args);
			const [ properties ] = args;
			const { root = document.body }  = properties;
			const maquetteProjectorOptions = {
				transitions: cssTransitions
			};

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('invalidated', this.scheduleRender));

			this.projector = createMaquetteProjector(maquetteProjectorOptions);
			this.root = root;
			this.projectorState = ProjectorState.Detached;
		}

		append() {
			const options = {
				type: AttachType.Append
			};

			return this.attach(options);
		}

		merge() {
			const options = {
				type: AttachType.Merge
			};

			return this.attach(options);
		}

		replace() {
			const options = {
				type: AttachType.Replace
			};

			return this.attach(options);
		}

		set root(root: Element) {
			if (this.projectorState === ProjectorState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		get root(): Element {
			return this._root;
		}

		__render__() {
			const result = super.__render__();
			if (typeof result === 'string' || result === null) {
				throw new Error('Must provide a VNode at the root of a projector');
			}
			const { afterCreate } = this;
			if (result.properties) {
				result.properties.afterCreate = afterCreate;
			}

			return result;
		}

		private scheduleRender(event: EventTargettedObject<this>) {
			const { target: projector } = event;
			if (this.projectorState === ProjectorState.Attached) {
				projector.emit({
					type: 'render:scheduled',
					target: projector
				});
				this.projector.scheduleRender();
			}
		}

		private attach({ type }: AttachOptions) {
			const render = this.__render__.bind(this);

			if (this.projectorState === ProjectorState.Attached) {
				return this.attachPromise || Promise.resolve({});
			}
			this.projectorState = ProjectorState.Attached;

			this.attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorState.Attached) {
						this.projector.stop();
						this.projector.detach(render);
						this.projectorState = ProjectorState.Detached;
					}
					this.attachHandle = { destroy() { } };
				}
			});

			this.attachPromise = new Promise((resolve, reject) => {
				this.afterCreate = () => {
					this.emit({
						type: 'projector:attached',
						target: this
					});
					resolve(this.attachHandle);
				};
			});

			switch (type) {
				case AttachType.Append:
					this.projector.append(this.root, render);
				break;
				case AttachType.Merge:
					this.projector.merge(this.root, render);
				break;
				case AttachType.Replace:
					this.projector.replace(this.root, render);
				break;
			}

			return this.attachPromise;
		}
	};
}
