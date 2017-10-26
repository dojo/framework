import 'pepjs';

import Evented from '@dojo/core/Evented';
import { createHandle } from '@dojo/core/lang';
import { Handle } from '@dojo/interfaces/core';
import { VNode } from '@dojo/interfaces/vdom';
import { includes } from '@dojo/shim/array';
import { assign } from '@dojo/shim/object';
import WeakMap from '@dojo/shim/WeakMap';
import {
	ClassesFunction,
	Constructor,
	DNode,
	ProjectionOptions,
	WidgetMetaBase,
	WidgetMetaConstructor,
	WidgetProperties,
	WNode
} from '@dojo/widget-core/interfaces';
import { decorate, isWNode, v, w } from '@dojo/widget-core/d';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
import cssTransitions from '@dojo/widget-core/animations/cssTransitions';
import { dom, Projection, VNodeProperties } from 'maquette';
import assertRender from './support/assertRender';
import callListener, { CallListenerOptions } from './support/callListener';
import sendEvent, { SendEventOptions } from './support/sendEvent';

const ROOT_CUSTOM_ELEMENT_NAME = 'test--harness';
const WIDGET_STUB_CUSTOM_ELEMENT = 'test--widget-stub';
const WIDGET_STUB_NAME_PROPERTY = 'data--widget-name';

let harnessId = 0;

const EVENT_HANDLERS = [
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

/**
 * An internal function which finds a VNode based on `key`
 * @param target The VNode to search
 * @param key The key to find
 */
function findVNodebyKey(target: VNode, key: string | object): VNode | undefined {
	if (typeof target === 'object' && target.properties && target.properties.key === key) {
		return target;
	}
	let found: VNode | undefined;
	if (typeof target === 'object' && target.children) {
		target.children
			.forEach((child) => {
				if (found) {
					if (findVNodebyKey(child, key)) {
						console.warn(`Duplicate key of "${key}" found.`);
					}
				}
				else {
					found = findVNodebyKey(child, key);
				}
			});
	}
	return found;
}

/**
 * Decorate a `DNode` where any `WNode`s are replaced with stubbed widgets
 * @param target The `DNode` to decorate with stubbed widgets
 */
function stubRender(target: DNode): DNode {
	decorate(
		target,
		(dNode: WNode) => {
			const { widgetConstructor, properties } = dNode;
			dNode.widgetConstructor = StubWidget;
			(properties as StubWidgetProperties)._stubTag = WIDGET_STUB_CUSTOM_ELEMENT;
			(properties as StubWidgetProperties)._widgetName = typeof widgetConstructor === 'string'
				? widgetConstructor
				: (widgetConstructor as any).name || '<Anonymous>';
		},
		(dNode) => isWNode(dNode)
	);
	return target;
}

interface StubWidgetProperties extends WidgetProperties {
	_stubTag: string;
	_widgetName: string;
}

class StubWidget extends WidgetBase<StubWidgetProperties> {
	render(): DNode {
		const { _stubTag: tag, _widgetName: widgetName } = this.properties;
		return v(tag, { [WIDGET_STUB_NAME_PROPERTY]: widgetName }, this.children);
	}
}

interface SpyWidgetMixin {
	meta<T extends WidgetMetaBase>(provider: WidgetMetaConstructor<T>): T;
	spyRender(result: DNode): DNode;
}

interface SpyTarget {
	actualRender(actual: DNode): void;
	decorateMeta<T extends WidgetMetaBase>(provider: T): T;
}

/**
 * A mixin that adds a spy to a widget
 * @param base The base class to add the render spy to
 * @param target An object with a property named `lastRender` which will be set to the result of the `render()` method
 */
function SpyWidgetMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T, target: SpyTarget): T & Constructor<SpyWidgetMixin> {

	class SpyRender extends base {
		@afterRender()
		spyRender(result: DNode): DNode {
			target.actualRender(result);
			return stubRender(result);
		}

		meta<U extends WidgetMetaBase>(provider: WidgetMetaConstructor<U>): U {
			return target.decorateMeta(super.meta(provider));
		}
	}

	return SpyRender;
}

interface MetaData {
	handle: Handle;
	mocks: Partial<WidgetMetaBase>;
}

/**
 * A private class that is used to actually render the widget and keep track of the last render by
 * the harnessed widget.
 */
class WidgetHarness<W extends WidgetBase<WidgetProperties>> extends WidgetBase<W['properties']> {
	private _afterCreate: (element: HTMLElement) => void;
	private _id = ROOT_CUSTOM_ELEMENT_NAME + '-' + (++harnessId);
	private _metaData: WeakMap<Constructor<WidgetMetaBase>, MetaData>;
	private _widgetConstructor: Constructor<W>;

	/**
	 * A string that will be added to the AssertionError that is thrown if actual render does not match
	 * expected render
	 */
	public assertionMessage: string | undefined;

	public didRender = false;

	/**
	 * What `DNode` that is expected on the next render
	 */
	public expectedRender: DNode | DNode[] | undefined;

	/**
	 * A reference to the previous render
	 */
	public lastRender: DNode | undefined;
	public renderCount = 0;

	constructor(widgetConstructor: Constructor<W>, afterCreate: (element: HTMLElement) => void, metaData: WeakMap<Constructor<WidgetMetaBase>, MetaData>) {
		super();

		this._widgetConstructor = SpyWidgetMixin(widgetConstructor, this);
		this._afterCreate = afterCreate;
		this._metaData = metaData;
	}

	protected onElementCreated(element: HTMLElement, key: string) {
		this._afterCreate(element);
	}

	/**
	 * Called by a harnessed widget's render spy, allowing potential assertion of the render
	 * @param actual The render, just after `afterRender`
	 */
	public actualRender(actual: DNode) {
		this.lastRender = actual;
		this.didRender = true;
		this.renderCount++;
		const { assertionMessage: message, expectedRender: expected } = this;
		if (expected) {
			this.expectedRender = undefined;
			this.assertionMessage = undefined;
			assertRender(actual, expected, message);
		}
	}

	/**
	 * _Mixin_ the methods that are provided as part of the mock.
	 * @param provider The instance of the meta provider associated with the harnessed widget
	 */
	public decorateMeta<T extends WidgetMetaBase>(provider: T): T {
		const data = this._metaData.get(provider.constructor as WidgetMetaConstructor<T>);
		return data ? assign(provider, data.mocks) : provider;
	}

	public invalidate(): void {
		super.invalidate();
	}

	/**
	 * Wrap the widget in a custom element
	 */
	public render(): DNode {
		const { _id: id, _widgetConstructor, children, properties } = this;
		return v(
				ROOT_CUSTOM_ELEMENT_NAME,
				{ id },
				[ w(_widgetConstructor, properties, children) ]
			);
	}
}

export interface HarnessSendEventOptions<I extends EventInit> extends SendEventOptions<I> {
	/**
	 * Find the target node by `key`
	 */
	key?: any;

	/**
	 * Provide an alternative target instead of the root DOM node
	 */
	target?: Element;
}

/**
 * Provides a run time context for methods of a meta mock.
 */
export type MetaMockContext<T extends WidgetMetaBase = WidgetMetaBase> = T & {
	/**
	 * Retrieve a reference to a node that is rendered in the DOM based on its key
	 */
	getNode(key: string | number): HTMLElement | undefined;

	/**
	 * Invalidate the widget.
	 */
	invalidate(): void;
};

/**
 * Harness a widget constructor, providing an API to interact with the widget for testing purposes.
 */
export class Harness<W extends WidgetBase<WidgetProperties>> extends Evented {
	private _attached = false;

	private _afterCreate = (element: HTMLElement) => { /* using a lambda property here creates a bound function */
		/* istanbul ignore next: difficult to create test conditions */
		if (this._root && this._root.parentNode) { /* just in case there was already a root node */
			this._root.parentNode.removeChild(this._root);
			this._root = undefined;
		}

		/* remove the element from the flow of the document upon destruction */
		this.own(createHandle(() => {
			if (element.parentNode) {
				element.parentNode.removeChild(element);
			}
		}));

		/* assign the element to the root of this document */
		this._root = element;
	}

	private _children: DNode[] | undefined;
	private _classes: string[] = [];
	private _currentRender: VNode;
	private _metaMap = new WeakMap<Constructor<WidgetMetaBase>, MetaData>();
	private _projection: Projection | undefined;
	private _projectionOptions: ProjectionOptions;
	private _projectionRoot: HTMLElement;
	private _properties: W['properties'];

	private _render = () => { /* using a lambda property here creates a bound function */
		this._projection && this._projection.update(this._currentRender = this._widgetHarnessRender() as VNode);
	}

	private _root: HTMLElement | undefined;
	private _widgetHarness: WidgetHarness<W>;
	private _widgetHarnessRender: () => string | VNode | null;

	/**
	 * A *stub* of an event handler/listener that can be used when creating expected virtual DOM
	 */
	public listener = () => true;

	/**
	 * Harness a widget constructor, providing an API to interact with the widget for testing purposes.
	 * @param widgetConstructor The constructor function/class that should be harnessed
	 * @param projectionRoot Where to append the harness.  Defaults to `document.body`
	 */
	constructor(widgetConstructor: Constructor<W>, projectionRoot: HTMLElement = document.body) {
		super({});

		this._widgetHarness = new WidgetHarness<W>(widgetConstructor, this._afterCreate, this._metaMap);
		this._widgetHarnessRender = this._widgetHarness.__render__.bind(this._widgetHarness);

		this._projectionRoot = projectionRoot;
		this._projectionOptions = {
			transitions: cssTransitions,
			eventHandlerInterceptor: this._eventHandlerInterceptor.bind(this._widgetHarness),
			nodeEvent: new Evented()
		};

		this.own(this._widgetHarness);
	}

	private _attach(): boolean {
		this.own(createHandle(() => {
			if (!this._attached) {
				return;
			}
			this._projection = undefined;
			this._attached = false;
		}));

		this._projection = dom.append(this._projectionRoot, this._currentRender = this._widgetHarnessRender() as VNode, this._projectionOptions);
		this._attached = true;
		return this._attached;
	}

	private _eventHandlerInterceptor(propertyName: string, eventHandler: Function, domNode: Element, properties: VNodeProperties) {
		if (includes(EVENT_HANDLERS, propertyName)) {
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

	private _invalidate(): void {
		if (this._properties) {
			// TODO: no need to coerce to any in 2.5.2
			this._widgetHarness.__setProperties__(this._properties as any);
		}
		if (this._children) {
			this._widgetHarness.__setChildren__(this._children);
		}
		if (!this._attached) {
			this._attach();
		}
		else {
			this._widgetHarness.invalidate();
			this._render();
		}
	}

	/**
	 * Call a listener on a target node of the virtual DOM.
	 * @param method The method to call on the target node
	 * @param options A map of options that effect the behavior of `callListener`
	 */
	public callListener(method: string, options?: CallListenerOptions): void {
		const render = this.getRender();
		if (typeof render !== 'object' || render === null) {
			throw new TypeError('Widget is not rendering an HNode or WNode');
		}
		callListener(render, method, options);
	}

	/**
	 * Provide a set of classes that should be returned as a map.  It is stateful in that previous classes
	 * will be negated in future calls.  Use `.resetClasses()` to clear the cache of classes.
	 * @param classes A rest argument of classes to be returned as a map
	 */
	public classes(...classes: (string | null)[]): ClassesFunction {
		return (): { [className: string ]: boolean } => {
			const result: { [className: string]: boolean } = {};

			this._classes.reduce((result, className) => {
				result[className] = false;
				return result;
			}, result);

			classes.reduce((result, className) => {
				if (className) {
					result[className] = true;
					if (!includes(this._classes, className)) {
						this._classes.push(className);
					}
				}
				return result;
			}, result);

			return result;
		};
	}

	/**
	 * Assert an expected virtual DOM (`DNode`) against what is actually being rendered.  Will throw if the expected does
	 * not match the actual.
	 * @param expected The expected render (`DNode`)
	 * @param message Any message to be part of an error that gets thrown if the actual and expected do not match
	 */
	public expectRender(expected: DNode | DNode[], message?: string): this {
		this._widgetHarness.expectedRender = expected;
		this._widgetHarness.assertionMessage = message;
		this._widgetHarness.didRender = false;
		this._invalidate();
		if (!this._widgetHarness.didRender) {
			throw new Error('An expected render did not occur.');
		}
		return this;
	}

	/**
	 * Refresh the render and return the last render's root `DNode`.
	 */
	public getRender(): DNode {
		this._invalidate();
		return this._widgetHarness.lastRender!;
	}

	/**
	 * Get the root element of the harnessed widget.  This will refresh the render.
	 */
	public getDom(): HTMLElement {
		if (!this._attached) {
			this._invalidate();
		}
		if (!(this._root && this._root.firstChild)) {
			throw new Error('No root node has been rendered');
		}
		return <HTMLElement> this._root.firstChild;
	}

	/**
	 * Provide a mock for a meta provider that will be used instead of source provider
	 * @param provider The meta provider to mock
	 * @param mocks A set of methods/properties to mock on the provider
	 */
	public mockMeta<T extends WidgetMetaBase>(provider: Constructor<T>, mocks: Partial<T>): Handle {
		const { _metaMap } = this;
		if (!_metaMap.has(provider)) {
			_metaMap.set(provider, {
				handle: createHandle(() => {
					_metaMap.delete(provider);
				}),
				// TODO: no need to coerce in 2.5.2
				mocks: mocks as any
			});
		}
		else {
			// TODO: no need to coerce in 2.5.2
			_metaMap.get(provider)!.mocks = mocks as any;
		}
		return _metaMap.get(provider)!.handle;
	}

	/**
	 * Clear any cached classes that have been cached via calls to `.classes()`
	 */
	public resetClasses(): this {
		this._classes = [];
		return this;
	}

	/**
	 * Dispatch an event to the root DOM element of the rendered harnessed widget.  You can use the options to change the
	 * event class, provide additional event properties, or select a different `target`.
	 *
	 * By default, the event class is `CustomEvent` and `bubbles` and `cancelable` are both `true` on events dispatched by
	 * the harness.
	 * @param type The type of event (e.g. `click` or `mousedown`)
	 * @param options Options which can modify the event sent, like using a different EventClass or selecting a different
	 *                        node to target, or provide the event initialisation properties
	 */
	public sendEvent<I extends EventInit>(type: string, options: HarnessSendEventOptions<I> = {}): this {
		let { target = this.getDom(), key, ...sendOptions } = options;
		if (key) {
			const vnode = findVNodebyKey(this._currentRender, key);
			if (vnode && vnode.domNode) {
				target = vnode.domNode as Element;
			}
			else {
				throw new Error(`Could not find key of "${key}" to sendEvent`);
			}
		}
		sendEvent(target, type, sendOptions);
		return this;
	}

	/**
	 * Set the children that will be used when rendering the harnessed widget
	 * @param children The children to be set on the harnessed widget
	 */
	public setChildren(children: DNode[]): this {
		this._children = children;
		return this;
	}

	/**
	 * Set the properties that will be passed to the harnessed widget on the next render
	 * @param properties The properties to set
	 */
	public setProperties(properties: W['properties']): this {
		this._properties = properties;
		return this;
	}
}

/**
 * Harness a widget class for testing purposes, returning an API to interact with the harness widget class.
 * @param widgetConstructor The constructor function/class of widget that should be harnessed.
 * @param projectionRoot The root where the harness should append itself to the DOM.  Default to `document.body`
 */
export default function harness<W extends WidgetBase<WidgetProperties>>(widgetConstructor: Constructor<W>, projectionRoot?: HTMLElement): Harness<W> {
	return new Harness(widgetConstructor, projectionRoot);
}
