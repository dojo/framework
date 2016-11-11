import { EventTargettedObject, EventObject, Handle } from 'dojo-interfaces/core';
import { on } from 'dojo-core/aspect';
import { assign } from 'dojo-core/lang';
import { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { resolveListener } from 'dojo-compose/bases/createEvented';
import {
	Evented,
	EventedOptions,
	EventedListenerOrArray,
	EventedListenersMap
} from 'dojo-interfaces/bases';
import Set from 'dojo-shim/Set';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { NodeAttributeFunction } from 'dojo-interfaces/widgetBases';

export type VNodeListenerReturn = boolean | undefined | null;

export interface VNodeListeners {
	[on: string]: undefined | ((ev?: EventTargettedObject<any>) => VNodeListenerReturn);
	ontouchcancel?(ev?: TouchEvent): VNodeListenerReturn;
	ontouchend?(ev?: TouchEvent): VNodeListenerReturn;
	ontouchmove?(ev?: TouchEvent): VNodeListenerReturn;
	ontouchstart?(ev?: TouchEvent): VNodeListenerReturn;
	onblur?(ev?: FocusEvent): VNodeListenerReturn;
	onchange?(ev?: Event): VNodeListenerReturn;
	onclick?(ev?: MouseEvent): VNodeListenerReturn;
	ondblclick?(ev?: MouseEvent): VNodeListenerReturn;
	onfocus?(ev?: FocusEvent): VNodeListenerReturn;
	oninput?(ev?: Event): VNodeListenerReturn;
	onkeydown?(ev?: KeyboardEvent): VNodeListenerReturn;
	onkeypress?(ev?: KeyboardEvent): VNodeListenerReturn;
	onkeyup?(ev?: KeyboardEvent): VNodeListenerReturn;
	onload?(ev?: Event): VNodeListenerReturn;
	onmousedown?(ev?: MouseEvent): VNodeListenerReturn;
	onmouseenter?(ev?: MouseEvent): VNodeListenerReturn;
	onmouseleave?(ev?: MouseEvent): VNodeListenerReturn;
	onmousemove?(ev?: MouseEvent): VNodeListenerReturn;
	onmouseout?(ev?: MouseEvent): VNodeListenerReturn;
	onmouseover?(ev?: MouseEvent): VNodeListenerReturn;
	onmouseup?(ev?: MouseEvent): VNodeListenerReturn;
	onmousewheel?(ev?: MouseWheelEvent): VNodeListenerReturn;
	onscroll?(ev?: UIEvent): VNodeListenerReturn;
	onsubmit?(ev?: Event): VNodeListenerReturn;
}

const vnodeEvents = new Set([
	'touchcancel',
	'touchend',
	'touchmove',
	'touchstart',
	'blur',
	'change',
	'click',
	'dblclick',
	'focus',
	'input',
	'keydown',
	'keypress',
	'keyup',
	'load',
	'mousedown',
	'mouseenter',
	'mouseleave',
	'mousemove',
	'mouseout',
	'mouseover',
	'mouseup',
	'mousewheel',
	'scroll',
	'submit'
]);

export interface VNodeEventedMixin {
	/**
	 * A map of listeners that are exposed for use by the virutal DOM
	 */
	listeners: VNodeListeners;

	/**
	 * An array of functions the provide the VNode attributes when rendering
	 */
	nodeAttributes: NodeAttributeFunction[];
}

export interface VNodeEventedOverrides {
	on(type: 'touchcancel', listener: EventedListenerOrArray<EventTarget, TouchEvent>): Handle;
	on(type: 'touchend', listener: EventedListenerOrArray<EventTarget, TouchEvent>): Handle;
	on(type: 'touchmove', listener: EventedListenerOrArray<EventTarget, TouchEvent>): Handle;
	on(type: 'blur', listener: EventedListenerOrArray<EventTarget, FocusEvent>): Handle;
	on(type: 'change', listener: EventedListenerOrArray<EventTarget, Event>): Handle;
	on(type: 'click', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'dblclick', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'focus', listener: EventedListenerOrArray<EventTarget, FocusEvent>): Handle;
	on(type: 'input', listener: EventedListenerOrArray<EventTarget, Event>): Handle;
	on(type: 'keydown', listener: EventedListenerOrArray<EventTarget, KeyboardEvent>): Handle;
	on(type: 'keypress', listener: EventedListenerOrArray<EventTarget, KeyboardEvent>): Handle;
	on(type: 'keyup', listener: EventedListenerOrArray<EventTarget, KeyboardEvent>): Handle;
	on(type: 'load', listener: EventedListenerOrArray<EventTarget, Event>): Handle;
	on(type: 'mousedown', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mouseenter', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mouseleave', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mousemove', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mouseout', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mouseover', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mouseup', listener: EventedListenerOrArray<EventTarget, MouseEvent>): Handle;
	on(type: 'mousewheel', listener: EventedListenerOrArray<EventTarget, MouseWheelEvent>): Handle;
	on(type: 'scroll', listener: EventedListenerOrArray<EventTarget, UIEvent>): Handle;
	on(type: 'submit', listener: EventedListenerOrArray<EventTarget, Event>): Handle;
}

export type VNodeEvented = Evented & VNodeEventedMixin & VNodeEventedOverrides;

export type VNodeEventedOptions = EventedOptions;

export interface VNodeEventedFactory extends ComposeFactory<VNodeEvented, VNodeEventedOptions> { }

/**
 * Internal function to convert an array of handles to a single array
 *
 * TODO: This is used in a couple places, maybe should migrate to a better place
 *
 * @params handles An array of handles
 */
function handlesArraytoHandle(handles: Handle[]): Handle {
	return {
		destroy() {
			handles.forEach((handle) => handle.destroy());
		}
	};
}

const UNINITIALIZED_LISTENERS = Object.freeze({});

const createVNodeEvented: VNodeEventedFactory = createEvented
	.mixin({
		mixin: {
			listeners: UNINITIALIZED_LISTENERS,

			nodeAttributes: [
				function (this: any): VNodeProperties {
					return assign({}, this.listeners);
				}
			]
		},
		aspectAdvice: {
			around: {
				on(origFn): (...args: any[]) => Handle {
					return function (this: VNodeEvented, ...args: any[]): Handle {
						if (args.length === 2) { /* overload: on(type, listener) */
							/* During initialization, sometimes the initialize functions occur out of order,
							* and Evented's initialize function could be called before this mixins, therefore
							* leaving this.listeners with an uninitiliazed value, therefore it is better to
							* determine if the value is unitialized here, ensuring that this.listeners is
							* always valid.
							*/
							if (this.listeners === UNINITIALIZED_LISTENERS) {
								this.listeners = {};
							}
							let type: string;
							let listeners: EventedListenerOrArray<VNodeEvented, EventTargettedObject<any>>;
							[ type, listeners ] = args;
							if (Array.isArray(listeners)) {
								const handles = listeners.map((listener) => vnodeEvents.has(type) ?
									on(this.listeners, 'on' + type, resolveListener(listener)) :
									origFn.call(this, type, listener));
								return handlesArraytoHandle(handles);
							}
							else {
								return vnodeEvents.has(type) ?
									on(this.listeners, 'on' + type, resolveListener(listeners)) :
									origFn.call(this, type, listeners);
							}
						}
						else if (args.length === 1) { /* overload: on(listeners) */
							const listenerMapArg: EventedListenersMap<any> = args[0];
							return handlesArraytoHandle(Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type])));
						}
						else { /* unexpected signature */
							throw new TypeError('Invalid arguments');
						}
					};
				},

				emit(origFn): <T extends EventObject>(event: T) => void {
					return function <T extends EventObject>(this: VNodeEvented, event: T): void {
						if (vnodeEvents.has(event.type)) {
							if (this.listeners === null) {
								this.listeners = {};
							}
							const method = this.listeners['on' + event.type];
							if (method) {
								method.call(this, event);
							}
						}
						else {
							origFn.call(this, event);
						}
					};
				}
			}
		}
	});

export default createVNodeEvented;
