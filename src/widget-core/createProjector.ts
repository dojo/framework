import { ComposeFactory } from 'dojo-compose/compose';
import { EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetState, WidgetOptions } from './interfaces';
import WeakMap from 'dojo-shim/WeakMap';
import { createProjector as createMaquetteProjector, Projector as MaquetteProjector } from 'maquette';
import createWidgetBase from './createWidgetBase';
import global from 'dojo-core/global';
import Promise from 'dojo-shim/Promise';

/**
 * Represents the state of the projector
 */
export enum ProjectorState {
	Attached = 1,
	Detached
};

/**
 * Projector interface
 */
export interface ProjectorOptions extends WidgetOptions<WidgetState> {

	/**
	 * An optional root of the projector
	 */
	root?: Element;

	/**
	 * If `true`, will configure the projector to support css transitions using `cssTransitions` global object.
	 * The projector will fail create if the options is true but the global object cannot be found.
	 */
	cssTransitions?: boolean;
}

export interface ProjectorMixin {

	/**
	 * Attach the projector to the an element provided as the root.
	 */
	attach(): Promise<Handle>;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The Maquette projector
	 */
	readonly projector: MaquetteProjector;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorState;
}

/**
 * Internal projector state
 */
interface ProjectorData {
	projector: MaquetteProjector;
	root: Element;
	state: ProjectorState;
	attachPromise?: Promise<Handle>;
	attachHandle?: Handle;
	afterCreate?: () => void;
}

export type Projector = Widget<WidgetState> & ProjectorMixin;

export interface ProjectorFactory extends ComposeFactory<Projector, ProjectorOptions> { }

/**
 * Private state map keyed by instance.
 */
const projectorDataMap = new WeakMap<Projector, ProjectorData>();

/**
 * Schedules a render.
 */
function scheduleRender(event: EventTargettedObject<Projector>) {
	const { target: projector } = event;
	const projectorData = projectorDataMap.get(projector);
	if (projectorData.state === ProjectorState.Attached) {
		projector.emit({
			type: 'render:scheduled',
			target: projector
		});
		projectorData.projector.scheduleRender();
	}
}

/**
 * Projector Factory
 */
const createProjector: ProjectorFactory = createWidgetBase
	.mixin({
		mixin: {
			attach(this: Projector) {
				const projectorData = projectorDataMap.get(this);
				const render = this.render.bind(this);

				if (projectorData.state === ProjectorState.Attached) {
					return projectorData.attachPromise || Promise.resolve({});
				}
				projectorData.state = ProjectorState.Attached;

				projectorData.attachHandle = this.own({
					destroy() {
						if (projectorData.state === ProjectorState.Attached) {
							projectorData.projector.stop();
							projectorData.projector.detach(render);
							projectorData.state = ProjectorState.Detached;
						}
						projectorData.attachHandle = { destroy() {} };
					}
				});

				projectorData.attachPromise = new Promise((resolve, reject) => {
					projectorData.afterCreate = () => {
						this.emit({
							type: 'projector:attached',
							target: this
						});
						resolve(projectorData.attachHandle);
					};
				});

				projectorData.projector.append(projectorData.root, render);

				return projectorData.attachPromise;
			},

			set root(this: Projector, root: Element) {
				const projectorData = projectorDataMap.get(this);
				if (projectorData.state === ProjectorState.Attached) {
					throw new Error('Projector already attached, cannot change root element');
				}
				projectorData.root = root;
			},

			get root(this: Projector): Element {
				const projectorData = projectorDataMap.get(this);
				return projectorData && projectorData.root;
			},

			get projector(this: Projector): MaquetteProjector {
				return projectorDataMap.get(this).projector;
			},

			get projectorState(this: Projector): ProjectorState {
				const projectorData = projectorDataMap.get(this);
				return projectorData && projectorData.state;
			}
		},
		aspectAdvice: {
			after: {
				render(this: Projector, result: VNode | string) {
					if (typeof result === 'string') {
						throw new Error('Must provide a VNode at the root of a projector');
					}
					return result;
				}
			}
		},
		initialize(instance: Projector, options: ProjectorOptions = {}) {
			const { root = document.body, cssTransitions = false } = options;
			const maquetteProjectorOptions: { transitions?: any } = {};

			if (cssTransitions) {
				if (global.cssTransitions) {
					maquetteProjectorOptions.transitions = global.cssTransitions;
				}
				else {
					throw new Error('Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
				}
			}

			instance.own(instance.on('invalidated', scheduleRender));

			const projector = createMaquetteProjector(maquetteProjectorOptions);

			projectorDataMap.set(instance, {
				projector,
				root,
				state: ProjectorState.Detached
			});
		}
	})
	.mixin({
		mixin: {
			nodeAttributes: [
				function(this: Projector): VNodeProperties {
					const { afterCreate } = projectorDataMap.get(this);
					return { afterCreate };
				}
			]
		}
	});

export default createProjector;
