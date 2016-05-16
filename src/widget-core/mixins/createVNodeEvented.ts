import { EventObject, Handle } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedOptions, EventedListener, resolveListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';

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
	on(type: 'touchcancel', listener: EventedListener<TouchEvent>): Handle;
	on(type: 'touchend', listener: EventedListener<TouchEvent>): Handle;
	on(type: 'touchmove', listener: EventedListener<TouchEvent>): Handle;
	on(type: 'blur', listener: EventedListener<FocusEvent>): Handle;
	on(type: 'change', listener: EventedListener<Event>): Handle;
	on(type: 'click', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'dblclick', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'focus', listener: EventedListener<FocusEvent>): Handle;
	on(type: 'input', listener: EventedListener<Event>): Handle;
	on(type: 'keydown', listener: EventedListener<KeyboardEvent>): Handle;
	on(type: 'keypress', listener: EventedListener<KeyboardEvent>): Handle;
	on(type: 'keyup', listener: EventedListener<KeyboardEvent>): Handle;
	on(type: 'load', listener: EventedListener<Event>): Handle;
	on(type: 'mousedown', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mouseenter', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mouseleave', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mousemove', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mouseout', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mouseover', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mouseup', listener: EventedListener<MouseEvent>): Handle;
	on(type: 'mousewheel', listener: EventedListener<MouseWheelEvent>): Handle;
	on(type: 'scroll', listener: EventedListener<UIEvent>): Handle;
	on(type: 'submit', listener: EventedListener<Event>): Handle;
	/**
	 * Add a listener to an event by type
	 * @param type The type of event to listen for
	 * @param listener The event listener to attach
	 */
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type VNodeEvented = Evented & VNodeEventedMixin & VNodeEventedOverrides;

export interface VNodeEventedFactory extends ComposeFactory<VNodeEvented, EventedOptions> { }

const createVNodeEvented: VNodeEventedFactory = createEvented.mixin({
	mixin: <VNodeEventedMixin> {
		listeners: <VNodeListeners> null
	},
	initialize(instance) {
		instance.listeners = {};
	},
	aspectAdvice: {
		around: {
			on(origFn): (type: string, listener: EventedListener<TargettedEventObject>) => Handle {
				return function (type: string, listener: EventedListener<TargettedEventObject>): Handle {
					const evented: VNodeEvented = this;
					if (vnodeEvents.indexOf(type) > -1) {
						type = 'on' + type;
						return on(evented.listeners, type, resolveListener(listener));
					}
					else {
						return origFn.call(evented, type, listener);
					}
				};
			},

			emit(origFn): <T extends EventObject>(event: T) => void {
				return function <T extends EventObject>(event: T): void {
					const evented: VNodeEvented = this;
					if (vnodeEvents.indexOf(event.type) > -1) {
						const method = evented.listeners['on' + event.type];
						if (method) {
							method.call(evented, event);
						}
					}
					else {
						origFn.call(evented, event);
					}
				};
			}
		}
	}
});

export default createVNodeEvented;
