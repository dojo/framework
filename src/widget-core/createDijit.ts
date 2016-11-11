import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/bases/createDestroyable';
import createEvented from 'dojo-compose/bases/createEvented';
import { State } from 'dojo-interfaces/bases';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions } from 'dojo-interfaces/widgetBases';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import createWidgetBase from './bases/createWidgetBase';

/**
 * The minimal API that is needed for Dojo 2 widgets to manage Dojo 1 Dijits
 */
export interface DijitWidget {
	/**
	 * pointer to original DOM node
	 */
	srcNodeRef: HTMLElement;

	/**
	 * This is our visible representation of the widget! Other DOM
	 * Nodes may by assigned to other properties, usually through the
	 * template system's data-dojo-attach-point syntax, but the domNode
	 * property is the canonical "top level" node in widget UI.
	 */
	domNode: HTMLElement;

	/**
	 * Processing after the DOM fragment is added to the document
	 */
	startup(): void;

	/**
	 * Destroy this class, releasing any resources registered via own().
	 */
	destroy(preserveDom?: boolean): void;
}

/**
 * The parameters that are passed to the Dijit constructor
 */
export interface DijitWidgetParams {
	[param: string]: any;
}

/**
 * A generic constructor for Dijits
 */
export interface DijitWidgetConstructor<D extends DijitWidget> {
	new (params: DijitWidgetParams, srcNodeRef: string | Node): D;
}

export interface DijitOptions<D extends DijitWidget> extends WidgetOptions<DijitState<D>> {
	/**
	 * An object of parameters to pass to the wrapped Dijit constructor
	 */
	params?: DijitWidgetParams;

	/**
	 * The Dijit constructor (or a MID that resolves to the Dijit constructor)
	 */
	Ctor?: DijitWidgetConstructor<D> | string;
}

export interface DijitState<D extends DijitWidget> extends State {
	Ctor?: string;
	params?: DijitWidgetParams;
}

export interface DijitMixin<D extends DijitWidget> {
	/**
	 * Returns the instantiated Dijit or undefined
	 *
	 * TODO: Mark as readonly in TS 2.0
	 */
	dijit: D;

	/**
	 * The constructor for the Dijit
	 *
	 * TODO: Mark as readonly in TS 2.0
	 */
	Ctor: DijitWidgetConstructor<D> | string;

	/**
	 * The parameters to pass the Dijit widget constructor
	 *
	 * TODO: Mark as readonly in TS 2.0
	 */
	params: DijitWidgetParams;
}

export type Dijit<D extends DijitWidget> = Widget<DijitState<D>> & DijitMixin<D>;

export interface DijitFactory extends ComposeFactory<Dijit<DijitWidget>, DijitOptions<DijitWidget>> {
	/**
	 * Create a new instance of a widget which wraps a Dijit
	 */
	<D extends DijitWidget>(options?: DijitOptions<D>): Dijit<D>;
}

/**
 * Internal function to handle construction of a Dijit
 * @param dijit The instance of the wrapper widget
 * @param srcNodeRef The DOM Node that should be used to pass to the Dijit constructor
 */
function constructDijitWidget(dijit: Dijit<DijitWidget>, srcNodeRef: Node): Promise<DijitWidget> {
	const dijitData = dijitDataWeakMap.get(dijit);
	return resolveCtor(dijitData.Ctor)
		.then((/* tslint:disable */Ctor/* tslint:enable */) => {
			const dijitWidget = new Ctor(dijitData.params || {}, srcNodeRef);
			dijitWidget.startup();
			return dijitWidget;
		});
}

/**
 * Internal function that handles the management of the DOM Element when the VNode
 * is added to the flow of the real DOM
 * @param element The DOM Element that is being
 */
function afterCreate(this: Dijit<DijitWidget>, element: HTMLElement) {
	const dijitData = dijitDataWeakMap.get(this);
	if (dijitData.dijitWidget) {
		element.parentNode.insertBefore(dijitData.dijitWidget.domNode, element);
		element.parentNode.removeChild(element);
	}
	else {
		constructDijitWidget(this, element)
			.then((dijitWidget) => {
				dijitData.dijitWidget = dijitWidget;
			}, (error) => {
				this.emit({
					type: 'error',
					error,
					target: this
				});
			});
	}
}

/**
 * A map of already loaded Ctors
 */
const ctorMap = new Map<string, DijitWidgetConstructor<DijitWidget>>();

/**
 * Intrernal function that handles resolving a Dijit widget contructor, including potentially
 * loading the module, if supplied as a string.
 *
 * Returns a `Promise` which resolves with the constructor.
 * @param Ctor The Dijit widget constructor to be resolved
 */
function resolveCtor<D extends DijitWidget>(/* tslint:disable */Ctor/* tslint:enable */: DijitWidgetConstructor<D> | string | undefined): Promise<DijitWidgetConstructor<D>> {
	if (Ctor === undefined) {
		return Promise.reject(new Error('Cannot load undefined constructor'));
	}
	if (typeof Ctor !== 'string') {
		return Promise.resolve(Ctor);
	}
	else if (ctorMap.has(Ctor)) {
		return Promise.resolve(ctorMap.get(Ctor));
	}
	else {
		/* TODO: Should we have a map of already resolved MIDs like the Dojo 1 Parser? */
		return new Promise((resolve, reject) => {
			const handle = require.on('error', (error: any) => {
				handle.remove();
				reject(error);
			});
			const mid = Ctor;
			require([ mid ], (/* tslint:disable */Ctor/* tslint:enable */: DijitWidgetConstructor<D>) => {
				handle.remove();
				if (Ctor && typeof Ctor === 'function') {
					ctorMap.set(mid, Ctor);
					resolve(Ctor);
				}
				else {
					reject(new Error(`Failed to load constructor from MID: "${Ctor}"`));
				}
			});
		});
	}
}

/**
 * Internal data structure for tracking Dijits
 */
interface DijitData<D extends DijitWidget> {
	/**
	 * The parameters to be passed to the constructor
	 */
	params?: DijitWidgetParams;

	/**
	 * The instance of the Dijit that was created
	 */
	dijitWidget?: D;

	/**
	 * The constructor for the Dijit
	 */
	Ctor?: DijitWidgetConstructor<D> | string;

	/**
	 * The callback provided to the VDOM to handle when the DOM node is created.
	 * This is a bound version to the Dijit wrapper.
	 */
	afterCreate?: (element: HTMLElement) => void;
}

/**
 * A weak map for storing the Dijit data structure
 */
const dijitDataWeakMap = new WeakMap<Dijit<DijitWidget>, DijitData<DijitWidget>>();

/**
 * Create a new instance of a Dijit "wrapper" which can integrate a Dijit into the Dojo 2
 * widgeting system.
 */
const createDijit: DijitFactory = createWidgetBase
	.mixin({
		mixin: <DijitMixin<DijitWidget>> {
			get dijit(this: Dijit<DijitWidget>): DijitWidget | undefined {
				return dijitDataWeakMap.get(this).dijitWidget;
			},

			get Ctor(this: Dijit<DijitWidget>): DijitWidgetConstructor<DijitWidget> | string | undefined {
				return dijitDataWeakMap.get(this).Ctor;
			},

			get params(this: Dijit<DijitWidget>): DijitWidgetParams | undefined {
				return dijitDataWeakMap.get(this).params;
			}
		},
		initialize(instance: Dijit<DijitWidget>, options: DijitOptions<DijitWidget>) {
			/* initialize the constructor */
			const dijitData: DijitData<DijitWidget> = {};
			dijitDataWeakMap.set(instance, dijitData);

			/* create bound version of afterCreate */
			dijitData.afterCreate = afterCreate.bind(instance);
			if (options) {
				dijitData.Ctor = options.Ctor;
				dijitData.params = options.params;
			}
		}
	})
	.mixin({
		mixin: createEvented,
		initialize(instance: Dijit<DijitWidget>) {
			instance.own(instance.on('state:changed', (event) => {
				const { /* tslint:disable */Ctor/* tslint:enable */, params } = event.state;
				if (Ctor || params) {
					const dijitData = dijitDataWeakMap.get(instance);
					if (!dijitData.dijitWidget) {
						if (Ctor) { /* TODO: same code as above on options */
							dijitData.Ctor = Ctor;
						}
						if (params) {
							dijitData.params = params;
						}
					}
				}
			}));
		}
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance: Dijit<DijitWidget>) {
			instance.own({
				destroy() {
					const dijitData = dijitDataWeakMap.get(instance);
					if (dijitData.dijitWidget && dijitData.dijitWidget.destroy) {
						/* TODO: Should we use .destroyRecursive()? */
						dijitData.dijitWidget.destroy();
					}
				}
			});
		}
	})
	.extend({
		nodeAttributes: [
			function(this: Dijit<DijitWidget>): VNodeProperties {
				const afterCreate = dijitDataWeakMap.get(this).afterCreate;
				return { afterCreate };
			}
		]
	});

export default createDijit;
