import has, { add as hasAdd } from '@dojo/core/has';
import { deepAssign } from '@dojo/core/lang';
import global from '@dojo/shim/global';
import { assign } from '@dojo/shim/object';

hasAdd('customevent-constructor', () => {
	try {
		new global.window.CustomEvent('foo');
		return true;
	}
	catch (e) {
		return false;
	}
});

export type EventClass =
	'AnimationEvent' |
	'AudioProcessingEvent' |
	'BeforeInputEvent' |
	'BeforeUnloadEvent' |
	'BlobEvent' |
	'ClipboardEvent' |
	'CloseEvent' |
	'CompositionEvent' |
	'CSSFontFaceLoadEvent' |
	'CustomEvent' |
	'DeviceLightEvent' |
	'DeviceMotionEvent' |
	'DeviceOrientationEvent' |
	'DeviceProximityEvent' |
	'DOMTransactionEvent' |
	'DragEvent' |
	'EditingBeforeInputEvent' |
	'ErrorEvent' |
	'FetchEvent' |
	'FocusEvent' |
	'GamepadEvent' |
	'HashChangeEvent' |
	'IDBVersionChangeEvent' |
	'InputEvent' |
	'KeyboardEvent' |
	'MediaStreamEvent' |
	'MessageEvent' |
	'MouseEvent' |
	'MutationEvent' |
	'OfflineAudioCompletionEvent' |
	'PageTransitionEvent' |
	'PointerEvent' |
	'PopStateEvent' |
	'ProgressEvent' |
	'RelatedEvent' |
	'RTCDataChannelEvent' |
	'RTCIdentityErrorEvent' |
	'RTCIdentityEvent' |
	'RTCPeerConnectionIceEvent' |
	'SensorEvent' |
	'StorageEvent' |
	'SVGEvent' |
	'SVGZoomEvent' |
	'TimeEvent' |
	'TouchEvent' |
	'TrackEvent' |
	'TransitionEvent' |
	'UIEvent' |
	'UserProximityEvent' |
	'WebGLContextEvent' |
	'WheelEvent';

export interface SendEventOptions<I extends EventInit> {
	/**
	 * The event class to use to create the event, defaults to `CustomEvent`
	 */
	eventClass?: EventClass;

	/**
	 * An object which is used to initialise the event
	 */
	eventInit?: I;

	/**
	 * A CSS selector string, used to query the target to identify the element to
	 * dispatch the event to
	 */
	selector?: string;
}

export interface EventInitializer {
	(type: string, bubbles: boolean, cancelable: boolean, detail: any): void;
}

/**
 * Create and dispatch an event to an element
 * @param type The event type to dispatch
 * @param options A map of options to configure the event
 */
export default function sendEvent<I extends EventInit>(target: Element, type: string, options?: SendEventOptions<I>): void {

	function dispatchEvent(target: Element, event: Event) {
		let error: Error | undefined;

		function catcher(e: ErrorEvent) {
			e.preventDefault();
			error = e.error;
			return true;
		}

		window.addEventListener('error', catcher);
		target.dispatchEvent(event);
		window.removeEventListener('error', catcher);
		if (error) {
			throw error;
		}
	}

	const {
		eventClass = 'CustomEvent',
		eventInit = {} as EventInit,
		selector = ''
	} = options || {};
	let event: CustomEvent;
	assign(eventInit, {
		bubbles: 'bubbles' in eventInit ? eventInit.bubbles : true,
		cancelable: 'cancelable' in eventInit ? eventInit.cancelable : true
	});
	const { bubbles, cancelable, ...initProps } = eventInit;
	if (has('customevent-constructor')) {
		const ctorName = eventClass in window ? eventClass : 'CustomEvent';
		event = new ((window as any)[ctorName] as typeof CustomEvent)(type, eventInit);
	}
	else {
		/* because the arity varies too greatly to be able to properly call all the event types, we will
		 * only support CustomEvent for those platforms that don't support event constructors, which is
		 * essentially IE11 */
		event = document.createEvent('CustomEvent');
		(event as CustomEvent).initCustomEvent(type, bubbles!, cancelable!, {});
	}
	try {
		deepAssign(event, initProps);
	}
	catch (e) { /* swallowing assignment errors when trying to overwrite native event properties */ }
	if (selector) {
		const selectorTarget = target.querySelector(selector);
		if (selectorTarget) {
			dispatchEvent(selectorTarget, event);
		}
		else {
			throw new Error(`Cannot resolve to an element with selector "${selector}"`);
		}
	}
	else {
		dispatchEvent(target, event);
	}
}
