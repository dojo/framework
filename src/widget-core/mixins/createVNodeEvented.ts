import { Handle, EventObject } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedOptions, EventedListener, resolveEventListener } from './createEvented';

export interface VNodeListeners {
	[on: string]: (ev?: EventObject) => boolean | void;
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
	'mouseneter',
	'mouseleave',
	'mousemove',
	'mouseout',
	'mouseover',
	'mouseup',
	'mousewheel',
	'scroll',
	'submit'
];

export interface VNodeEvented extends Evented {
	listeners: VNodeListeners;
	on(type: 'touchcancel', listener: EventedListener<TouchEvent>): Handle;
	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface VNodeEventedFactory extends ComposeFactory<VNodeEvented, EventedOptions> { }

const createVNodeEvented: VNodeEventedFactory = createEvented.mixin({
	mixin: {
		listeners: <VNodeListeners> null
	},
	initialize(instance) {
		instance.listeners = {};
	},
	aspectAdvice: {
		around: {
			on(origFn): (type: string, listener: EventedListener<EventObject>) => Handle {
				return function (type: string, listener: EventedListener<EventObject>): Handle {
					const evented: VNodeEvented = this;
					if (vnodeEvents.indexOf(type) > -1) {
						type = 'on' + type;
						return on(evented.listeners, type, resolveEventListener(listener));
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
