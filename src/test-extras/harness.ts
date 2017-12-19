import 'pepjs';

import Evented from '@dojo/core/Evented';
import { createHandle } from '@dojo/core/lang';
import { Handle } from '@dojo/core/interfaces';
import { assign } from '@dojo/shim/object';
import WeakMap from '@dojo/shim/WeakMap';
import {
	Constructor,
	DNode,
	HNode,
	WidgetMetaBase,
	WidgetMetaConstructor,
	WidgetProperties,
	WNode
} from '@dojo/widget-core/interfaces';
import { decorate, isHNode, isWNode, v, w } from '@dojo/widget-core/d';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
import { ProjectorMixin } from '@dojo/widget-core/mixins/Projector';
import assertRender from './support/assertRender';
import supportCallListener, { CallListenerOptions } from './support/callListener';
import sendEvent, { SendEventOptions } from './support/sendEvent';
import { RenderResults } from './support/d';

/* tslint:disable:variable-name */

const ROOT_CUSTOM_ELEMENT_NAME = 'test--harness';
const WIDGET_STUB_CUSTOM_ELEMENT = 'test--widget-stub';
const WIDGET_STUB_NAME_PROPERTY = 'data--widget-name';

let harnessId = 0;

/**
 * An internal function which finds a DNode base on a `key`
 * @param target the root DNode to search
 * @param key the key to match
 */
export function findDNodeByKey(target: RenderResults, key: string | object): HNode | WNode | undefined {
	if (!target) {
		return;
	}
	if (Array.isArray(target)) {
		let found: HNode | WNode | undefined;
		target.forEach((node) => {
			if (found) {
				if (findDNodeByKey(node, key)) {
					console.warn(`Duplicate key of "${key}" found.`);
				}
			} else {
				found = findDNodeByKey(node, key);
			}
		});
		return found;
	} else {
		if (target && typeof target === 'object') {
			if (target.properties && target.properties.key === key) {
				return target;
			}
			return findDNodeByKey(target.children, key);
		}
	}
}

/**
 * Decorate a `DNode` where any `WNode`s are replaced with stubbed widgets
 * @param target The `DNode` to decorate with stubbed widgets
 */
function stubRender(target: RenderResults): RenderResults {
	if (target) {
		if (Array.isArray(target)) {
			target.forEach((node) => {
				decorateTarget(node);
			});
		} else {
			decorateTarget(target);
		}
	}
	return target;
}

function decorateTarget(target: DNode): void {
	decorate(
		target,
		(dNode: WNode) => {
			const { widgetConstructor, properties } = dNode;
			dNode.widgetConstructor = StubWidget;
			(properties as StubWidgetProperties)._stubTag = WIDGET_STUB_CUSTOM_ELEMENT;
			(properties as StubWidgetProperties)._widgetName =
				typeof widgetConstructor === 'string'
					? widgetConstructor
					: (widgetConstructor as any).name || '<Anonymous>';
		},
		isWNode
	);
}

interface StubWidgetProperties extends WidgetProperties {
	_stubTag: string;
	_widgetName: string;
}

class StubWidget extends WidgetBase<StubWidgetProperties> {
	render(): RenderResults {
		const { _stubTag: tag, _widgetName: widgetName } = this.properties;
		return v(tag, { [WIDGET_STUB_NAME_PROPERTY]: widgetName }, this.children);
	}
}

interface SpyWidgetMixin {
	meta<T extends WidgetMetaBase>(provider: WidgetMetaConstructor<T>): T;
	spyRender(result: RenderResults): RenderResults;
}

interface SpyTarget {
	actualRender(actual: RenderResults): void;
	decorateMeta<T extends WidgetMetaBase>(provider: T): T;
}

/**
 * A mixin that adds a spy to a widget
 * @param base The base class to add the render spy to
 * @param target An object with a property named `lastRender` which will be set to the result of the `render()` method
 */
function SpyWidgetMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(
	base: T,
	target: SpyTarget
): T & Constructor<SpyWidgetMixin> {
	class SpyRender extends base {
		@afterRender()
		spyRender(result: RenderResults): RenderResults {
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
class WidgetHarness<W extends WidgetBase> extends WidgetBase {
	private _id = ROOT_CUSTOM_ELEMENT_NAME + '-' + ++harnessId;
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
	public expectedRender: RenderResults | undefined;

	/**
	 * A reference to the previous render
	 */
	public lastRender: RenderResults | undefined;
	public renderCount = 0;

	constructor(widgetConstructor: Constructor<W>, metaData: WeakMap<Constructor<WidgetMetaBase>, MetaData>) {
		super();
		this._widgetConstructor = SpyWidgetMixin(widgetConstructor, this);
		this._metaData = metaData;
	}

	/**
	 * Called by a harnessed widget's render spy, allowing potential assertion of the render
	 * @param actual The render, just after `afterRender`
	 */
	public actualRender(actual: RenderResults) {
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
	public render(): RenderResults {
		const { _id: id, _widgetConstructor, children, properties } = this;
		return v(ROOT_CUSTOM_ELEMENT_NAME, { id }, [w(_widgetConstructor, properties, children)]);
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

type ProjectorWidgetHarness<W extends WidgetBase<WidgetProperties>> = ProjectorMixin<W['properties']> &
	WidgetHarness<W>;

const ProjectorWidgetHarness = ProjectorMixin(WidgetHarness);

/**
 * Harness a widget constructor, providing an API to interact with the widget for testing purposes.
 */
export class Harness<W extends WidgetBase<WidgetProperties>> extends Evented {
	private _children: W['children'] | undefined;
	private _metaMap = new WeakMap<Constructor<WidgetMetaBase>, MetaData>();
	private _projectorHandle: Handle | undefined;
	private _properties: W['properties'] | undefined;
	private _root: HTMLElement | undefined;
	private _scheduleRender: () => void;
	private _widgetHarness: ProjectorWidgetHarness<W>;

	private _invalidate() {
		if (this._properties) {
			this._widgetHarness.setProperties(this._properties as any);
			this._properties = undefined;
		}
		if (this._children) {
			this._widgetHarness.setChildren(this._children);
			this._children = undefined;
		}
		if (!this._projectorHandle) {
			this._widgetHarness.async = false;
			this._projectorHandle = this._widgetHarness.append(this._root);
		}
		this._scheduleRender();
	}

	constructor(widgetConstructor: Constructor<W>, root?: HTMLElement) {
		super();

		const widgetHarness = (this._widgetHarness = new ProjectorWidgetHarness(widgetConstructor, this._metaMap));
		// we want to control when the render gets scheduled, so we will hijack the projects one
		this._scheduleRender = widgetHarness.scheduleRender.bind(widgetHarness);
		widgetHarness.scheduleRender = () => {};
		this.own(widgetHarness);
		this._root = root;
	}

	/**
	 * Provides a reference to a function that can be used when creating an expected render value
	 */
	public listener = () => true;

	/**
	 * Call a listener on a target node of the virtual DOM.
	 * @param method The method to call on the target node
	 * @param options A map of options that effect the behavior of `callListener`
	 */
	public callListener(method: string, options?: CallListenerOptions): void {
		const render = this.getRender();
		if (render == null || typeof render !== 'object') {
			throw new TypeError('Widget is not rendering an HNode or WNode');
		}
		supportCallListener(render, method, options);
	}

	/**
	 * Assert an expected virtual DOM (`DNode`) against what is actually being rendered.  Will throw if the expected does
	 * not match the actual.
	 * @param expected The expected render (`DNode`)
	 * @param message Any message to be part of an error that gets thrown if the actual and expected do not match
	 */
	public expectRender(expected: RenderResults, message?: string): this {
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
	 * Get the root element of the harnessed widget.  This will refresh the render.
	 */
	public getDom(): HTMLElement {
		if (!this._projectorHandle) {
			this._invalidate();
		}
		if (!this._widgetHarness.lastRender || !(this._widgetHarness.lastRender as any).domNode) {
			throw new Error('No root node has been rendered');
		}
		return (this._widgetHarness.lastRender as any).domNode as HTMLElement;
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
		} else {
			// TODO: no need to coerce in 2.5.2
			_metaMap.get(provider)!.mocks = mocks as any;
		}
		return _metaMap.get(provider)!.handle;
	}

	/**
	 * Refresh the render and return the last render's root `DNode`.
	 */
	public getRender(): RenderResults {
		this._invalidate();
		return this._widgetHarness.lastRender;
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
			const dnode = findDNodeByKey(this._widgetHarness.lastRender, key);
			if (isHNode(dnode)) {
				target = (dnode as any).domNode as Element;
			} else {
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
	public setChildren(children: W['children']): this {
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
 * @param root The root where the harness should append itself to the DOM.  Defaults to `document.body`
 */
export default function harness<W extends WidgetBase<WidgetProperties>>(
	widgetConstructor: Constructor<W>,
	root?: HTMLElement
): Harness<W> {
	return new Harness(widgetConstructor, root);
}
