import { EventTargettedObject, Handle } from '@dojo/interfaces/core';
import Promise from '@dojo/shim/Promise';
import { createProjector as createMaquetteProjector, Projector as MaquetteProjector } from 'maquette';
import { WidgetBase } from './../WidgetBase';
import { Constructor, WidgetProperties } from './../interfaces';
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
	append(root?: Element): Promise<Handle>;

	/**
	 * Merge the projector onto the root.
	 */
	merge(root?: Element): Promise<Handle>;

	/**
	 * Replace the root with the projector node.
	 */
	replace(root?: Element): Promise<Handle>;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorState;
}

export function ProjectorMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T): T & Constructor<ProjectorMixin> {
	return class extends base {

		public projectorState: ProjectorState;
		private readonly projector: MaquetteProjector;

		private _root: Element;
		private attachPromise: Promise<Handle>;
		private attachHandle: Handle;
		private afterCreate: (...args: any[]) => void;
		private originalAfterCreate?: () => void;

		constructor(...args: any[]) {
			super(...args);
			const maquetteProjectorOptions = {
				transitions: cssTransitions
			};

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('invalidated', this.scheduleRender));

			this.projector = createMaquetteProjector(maquetteProjectorOptions);
			this.root = document.body;
			this.projectorState = ProjectorState.Detached;
		}

		append(root?: Element) {
			const options = {
				type: AttachType.Append,
				root
			};

			return this.attach(options);
		}

		merge(root?: Element) {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this.attach(options);
		}

		replace(root?: Element) {
			const options = {
				type: AttachType.Replace,
				root
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
				if (result.properties.afterCreate) {
					this.originalAfterCreate = <any> result.properties.afterCreate;
				}

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

		private attach({ type, root }: AttachOptions) {
			const render = this.__render__.bind(this);
			if (root) {
				this.root = root;
			}

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
				this.afterCreate = (...args: any[]) => {
					if (this.originalAfterCreate) {
						const [ , , , properties ] = args;
						this.originalAfterCreate.apply(properties.bind || properties, args);
					}

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

export default ProjectorMixin;
