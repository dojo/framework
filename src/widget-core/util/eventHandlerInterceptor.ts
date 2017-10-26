import { includes } from '@dojo/shim/array';
import { VirtualDomProperties } from './../interfaces';
import Projector from '../mixins/Projector';

export const eventHandlers = [
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

export default function eventHandlerInterceptor(
	this: Projector<any>,
	propertyName: string,
	eventHandler: Function,
	domNode: Element,
	properties: VirtualDomProperties
) {
	if (includes(eventHandlers, propertyName)) {
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
