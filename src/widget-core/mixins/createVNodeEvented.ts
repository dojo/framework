import { EventObject, Handle } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedOptions, EventedListenerOrArray, EventedListenersMap, resolveListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';

export interface VNodeListeners {
	[on: string]: (ev?: TargettedEventObject) => boolean | void;
	ontouchcancel?(ev?: TouchEvent): boolean | void;
	ontouchend?(ev?: TouchEvent): boolean | void;
	ontouchmove?(ev?: TouchEvent): boolean | void;
	ontouchstart?(ev?: TouchEvent): boolean | void;
	onblur?(ev?: FocusEvent): boolean | void;
	onchange?(ev?: Event): boolean | void;
	onclick?(ev?: MouseEvent): boolean | void;
	ondblclick?(ev?: MouseEvent): boolean | void;
	onfocus?(ev?: FocusEvent): boolean | void;
	oninput?(ev?: Event): boolean | void;
	onkeydown?(ev?: KeyboardEvent): boolean | void;
	onkeypress?(ev?: KeyboardEvent): boolean | void;
	onkeyup?(ev?: KeyboardEvent): boolean | void;
	onload?(ev?: Event): boolean | void;
	onmousedown?(ev?: MouseEvent): boolean | void;
	onmouseenter?(ev?: MouseEvent): boolean | void;
	onmouseleave?(ev?: MouseEvent): boolean | void;
	onmousemove?(ev?: MouseEvent): boolean | void;
	onmouseout?(ev?: MouseEvent): boolean | void;
	onmouseover?(ev?: MouseEvent): boolean | void;
	onmouseup?(ev?: MouseEvent): boolean | void;
	onmousewheel?(ev?: MouseWheelEvent): boolean | void;
	onscroll?(ev?: UIEvent): boolean | void;
	onsubmit?(ev?: Event): boolean | void;
}

const vnodeEvents = [
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
];

export interface VNodeEventedMixin {
	/**
	 * A map of listeners that are exposed for use by the virutal DOM
	 */
	listeners: VNodeListeners;
}

export interface VNodeEventedOverrides {
	on(type: 'touchcancel', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'touchend', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'touchmove', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'blur', listener: EventedListenerOrArray<FocusEvent>): Handle;
	on(type: 'change', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'click', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'dblclick', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'focus', listener: EventedListenerOrArray<FocusEvent>): Handle;
	on(type: 'input', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'keydown', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'keypress', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'keyup', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'load', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'mousedown', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseenter', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseleave', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mousemove', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseout', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseover', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseup', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mousewheel', listener: EventedListenerOrArray<MouseWheelEvent>): Handle;
	on(type: 'scroll', listener: EventedListenerOrArray<UIEvent>): Handle;
	on(type: 'submit', listener: EventedListenerOrArray<Event>): Handle;
	/**
	 * Add a listener to an event by type
	 * @param type The type of event to listen for
	 * @param listener The event listener to attach
	 */
	on(type: string, listener: EventedListenerOrArray<TargettedEventObject>): Handle;
}

export type VNodeEvented = Evented & VNodeEventedMixin & VNodeEventedOverrides;

export interface VNodeEventedFactory extends ComposeFactory<VNodeEvented, EventedOptions> { }

/**
 * Internal function that determines if an event is a VNode Event
 * @params type The string the represents the event type
 */
function isVNodeEvent(type: string): boolean {
	return Boolean(vnodeEvents.indexOf(type) > -1);
}

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

const createVNodeEvented: VNodeEventedFactory = createEvented.mixin({
	mixin: <VNodeEventedMixin> {
		listeners: <VNodeListeners> null
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
						if (this.listeners === null) {
							this.listeners = {};
						}
						let type: string;
						let listeners: EventedListenerOrArray<TargettedEventObject>;
						[ type, listeners ] = args;
						if (Array.isArray(listeners)) {
							const handles = listeners.map((listener) => isVNodeEvent(type) ?
								on(this.listeners, 'on' + type, resolveListener(listener)) :
								origFn.call(this, type, listener));
							return handlesArraytoHandle(handles);
						}
						else {
							return isVNodeEvent(type) ?
								on(this.listeners, 'on' + type, resolveListener(listeners)) :
								origFn.call(this, type, listeners);
						}
					}
					else if (args.length === 1) { /* overload: on(listeners) */
						const listenerMapArg: EventedListenersMap = args[0];
						return handlesArraytoHandle(Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type])));
					}
					else { /* unexpected signature */
						throw new TypeError('Invalid arguments');
					}
				};
			},

			emit(origFn): <T extends EventObject>(event: T) => void {
				return function <T extends EventObject>(this: VNodeEvented, event: T): void {
					if (isVNodeEvent(event.type)) {
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
