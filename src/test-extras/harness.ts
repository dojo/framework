import 'pepjs';

import Evented from '@dojo/core/Evented';
import { assign, createHandle } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';
import { includes } from '@dojo/shim/array';
import { Constructor, DNode, HNode, VirtualDomProperties, WidgetBaseInterface, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';
import { decorate, isHNode, isWNode, v, w } from '@dojo/widget-core/d';
import WidgetBase, { afterRender } from '@dojo/widget-core/WidgetBase';
import cssTransitions from '@dojo/widget-core/animations/cssTransitions';
import { dom, Projection, ProjectionOptions, VNodeProperties } from 'maquette';
import assertRender from './support/assertRender';
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
 * Decorate a `DNode` where any `WNode`s are replaced with stubbed widgets
 * @param target The `DNode` to decorate with stubbed widgets
 */
function stubRender(target: DNode): DNode {
	decorate(
		target,
		(dNode: WNode) => {
			const { widgetConstructor, properties } = dNode;
			dNode.widgetConstructor = StubWidget;
			(<StubWidgetProperties> properties)._stubTag = WIDGET_STUB_CUSTOM_ELEMENT;
			(<StubWidgetProperties> properties)._widgetName = typeof widgetConstructor === 'string'
				? widgetConstructor
				: (<any> widgetConstructor).name || '<Anonymous>';
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
		const { bind, _stubTag: tag, _widgetName: widgetName } = this.properties;
		return v(tag, { bind, [WIDGET_STUB_NAME_PROPERTY]: widgetName }, this.children);
	}
}

interface SpyRenderMixin {
	spyRender(result: DNode): DNode;
}

interface SpyTarget {
	actualRender(actual: DNode): void;
}

/**
 * A mixin that adds a spy to the render process
 * @param base The base class to add the render spy to
 * @param target An object with a property named `lastRender` which will be set to the result of the `render()` method
 */
function SpyRenderMixin<T extends Constructor<WidgetBaseInterface<WidgetProperties>>>(base: T, target: SpyTarget): T & Constructor<SpyRenderMixin> {

	class SpyRender extends base {
		@afterRender()
		spyRender(result: DNode): DNode {
			target.actualRender(result);
			return stubRender(result);
		}
	};

	return SpyRender;
}

/**
 * A private class that is used to actually render the widget and keep track of the last render by
 * the harnessed widget.
 */
class WidgetHarness<P extends WidgetProperties, W extends Constructor<WidgetBaseInterface<P>>> extends WidgetBase<P> {
	private _widgetConstructor: W;
	private _afterCreate: (element: HTMLElement) => void;
	private _id = ROOT_CUSTOM_ELEMENT_NAME + '-' + (++harnessId);

	/**
	 * A string that will be added to the AssertionError that is thrown if actual render does not match
	 * expected render
	 */
	public assertionMessage: string | undefined;

	public didRender = false;

	/**
	 * What `DNode` that is expected on the next render
	 */
	public expectedRender: DNode | undefined;

	/**
	 * A reference to the previous render
	 */
	public lastRender: DNode | undefined;
	public renderCount = 0;

	constructor(widgetConstructor: W, afterCreate: (element: HTMLElement) => void) {
		super();

		this._widgetConstructor = SpyRenderMixin(widgetConstructor, this);
		this._afterCreate = afterCreate;
	}

	/**
	 * Called by a harnessed widget's render spy, allowing potential assertion of the render
	 * @param actual The render, just after `afterRender`
	 */
	actualRender(actual: DNode) {
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
	 * Wrap the widget in a custom element
	 */
	render(): DNode {
		const { _afterCreate: afterCreate, _id: id, _widgetConstructor, children, properties } = this;
		return v(
				ROOT_CUSTOM_ELEMENT_NAME,
				{ afterCreate, id },
				[ w(_widgetConstructor, properties, children) ]
			);
	}
}

export interface HarnessSendEventOptions<I extends EventInit> extends SendEventOptions<I> {
	target?: Element;
}

/**
 * Harness a widget constructor, providing an API to interact with the widget for testing purposes.
 */
export class Harness<P extends WidgetProperties, W extends Constructor<WidgetBaseInterface<P>>> extends Evented {
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
	private _projection: Projection | undefined;
	private _projectionOptions: ProjectionOptions;
	private _projectionRoot: HTMLElement;
	private _properties: P;

	private _render = () => { /* using a lambda property here creates a bound function */
		this._projection && this._projection.update(this._widgetHarnessRender() as VNode);
	}

	private _root: HTMLElement | undefined;
	private _widgetHarness: WidgetHarness<P, W>;
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
	constructor(widgetConstructor: W, projectionRoot: HTMLElement = document.body) {
		super({});

		this._widgetHarness = new WidgetHarness<P, W>(widgetConstructor, this._afterCreate);
		this._widgetHarnessRender = this._widgetHarness.__render__.bind(this._widgetHarness);

		this._projectionRoot = projectionRoot;
		this._projectionOptions = {
			transitions: cssTransitions,
			eventHandlerInterceptor: this._eventHandlerInterceptor.bind(this._widgetHarness)
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

		this.own(this._widgetHarness.on('widget:children', this._widgetHarness.invalidate));
		this.own(this._widgetHarness.on('properties:changed', this._widgetHarness.invalidate));
		this.own(this._widgetHarness.on('invalidated', this._render));

		this._projection = dom.append(this._projectionRoot, this._widgetHarnessRender() as VNode, this._projectionOptions);
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
			this._widgetHarness.setProperties(this._properties);
		}
		if (this._children) {
			this._widgetHarness.setChildren(this._children);
		}
		if (!this._attached) {
			this._attach();
		}
		else {
			this._widgetHarness.invalidate();
		}
	}

	/**
	 * Provide a set of classes that should be returned as a map.  It is stateful in that previous classes
	 * will be negated in future calls.  Use `.resetClasses()` to clear the cache of classes.
	 * @param classes A rest argument of classes to be returned as a map
	 */
	public classes(...classes: (string | null)[]): { [className: string ]: boolean } {
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
	}

	/**
	 * Assert an expected virtual DOM (`DNode`) against what is actually being rendered.  Will throw if the expected does
	 * not match the actual.
	 * @param expected The expected render (`DNode`)
	 * @param message Any message to be part of an error that gets thrown if the actual and expected do not match
	 */
	public expectRender(expected: DNode, message?: string): this {
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
	 * Clear any cached classes that have been cached via calls to `.classes()`
	 */
	public resetClasses(): this {
		this._classes = [];
		return this;
	}

	/**
	 * Dispatch an event to the root DOM element of the rendered harnessed widget.  You can use the options to change the
	 * event class, provide additional event properties, or select a different target.
	 *
	 * By default, the event class is `CustomEvent` and `bubbles` and `cancelable` are both `true` on events dispatched by
	 * the harness.
	 * @param type The type of event (e.g. `click` or `mousedown`)
	 * @param options Options which can modify the event sent, like using a different EventClass or selecting a different
	 *                        node to target, or provide the event initialisation properties
	 */
	public sendEvent<I extends EventInit>(type: string, options: HarnessSendEventOptions<I> = {}): this {
		const { target = this.getDom() } = options;
		sendEvent(target, type, options);
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
	public setProperties(properties: P): this {
		this._properties = properties;
		return this;
	}
}

/**
 * Harness a widget class for testing purposes, returning an API to interact with the harness widget class.
 * @param widgetConstructor The constructor function/class of widget that should be harnessed.
 * @param projectionRoot The root where the harness should append itself to the DOM.  Default to `document.body`
 */
export default function harness<P extends WidgetProperties, W extends Constructor<WidgetBaseInterface<P>>>(widgetConstructor: W, projectionRoot?: HTMLElement): Harness<P, W> {
	return new Harness<P, W>(widgetConstructor, projectionRoot);
}

/* Helper functions */

export function assignChildProperties(target: WNode | HNode, index: number | string, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	const node = resolveChild(target, index);
	if (!(isWNode(node) || isHNode(node))) {
		throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
	}
	assignProperties(node, properties);
	return target;
}

export function assignProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function assignProperties(target: WNode, properties: WidgetProperties): WNode;
export function assignProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode;
export function assignProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	assign(target.properties, properties);
	return target;
}

/**
 * Replace a child of DNode.
 *
 * *NOTE:* The replacement modify the passed `target` and does not return a new instance of the `DNode`.
 * @param target The DNode to replace a child element on
 * @param index A number of the index of a child, or a string with comma seperated indexes that would nagivate
 * @param replacement The DNode to be replaced
 */
export function replaceChild(target: WNode | HNode, index: number | string, replacement: DNode): WNode | HNode {
	/* TODO: Combine with resolveChild */
	if (typeof index === 'number') {
		if (!target.children) {
			target.children = [];
		}
		target.children[index] = replacement;
	}
	else {
		const indexes = index.split(',').map(Number);
		const lastIndex = indexes.pop()!;
		const resolvedTarget = indexes.reduce((target, idx) => {
			if (!(isWNode(target) || isHNode(target)) || !target.children) {
				throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
			}
			return target.children[idx];
		}, <DNode> target);
		if (!(isWNode(resolvedTarget) || isHNode(resolvedTarget))) {
			throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
		}
		if (!resolvedTarget.children) {
			resolvedTarget.children = [];
		}
		resolvedTarget.children[lastIndex] = replacement;
	}
	return target;
}

function resolveChild(target: WNode | HNode, index: number | string): DNode {
	if (typeof index === 'number') {
		if (!target.children) {
			throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
		}
		return target.children[index];
	}
	const indexes = index.split(',').map(Number);
	const lastIndex = indexes.pop()!;
	const resolvedTarget = indexes.reduce((target, idx) => {
		if (!(isWNode(target) || isHNode(target)) || !target.children) {
			throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
		}
		return target.children[idx];
	}, <DNode> target);
	if (!(isWNode(resolvedTarget) || isHNode(resolvedTarget)) || !resolvedTarget.children) {
		throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
	}
	return resolvedTarget.children[lastIndex];
}

export function replaceChildProperties(target: WNode | HNode, index: number | string, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	const node = resolveChild(target, index);
	if (!(isWNode(node) || isHNode(node))) {
		throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
	}
	replaceProperties(node, properties);
	return target;
}

export function replaceProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function replaceProperties(target: WNode, properties: WidgetProperties): WNode;
export function replaceProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode;
export function replaceProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	target.properties = properties;
	return target;
}
