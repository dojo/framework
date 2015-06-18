import Evented from '../../Evented';
import { Handle } from '../../interfaces';
import on, { EventEmitter } from '../../on';
import Promise from '../../Promise';
import { Source } from '../ReadableStream';
import ReadableStreamController from '../ReadableStreamController';

export type EventTargetTypes = Evented | EventEmitter | EventTarget;
export type EventTypes = string | string[];

export default class EventedStreamSource implements Source<Event> {
	protected _controller: ReadableStreamController<Event>;
	protected _target: EventTargetTypes;
	protected _events: string[];
	protected _handles: Handle[];

	constructor(target: EventTargetTypes, type: EventTypes) {
		this._target = target;

		if (Array.isArray(type)) {
			this._events = <any> type;
		}
		else {
			this._events = [ <any> type ];
		}

		this._handles = [];
	}

	start(controller: ReadableStreamController<Event>): Promise<void> {
		this._controller = controller;
		this._events.forEach((eventName: string) => {
			this._handles.push(on(<any> this._target, eventName, this._handleEvent.bind(this)));
		});

		return Promise.resolve();
	}

	cancel(reason?: any): Promise<void> {
		while (this._handles.length) {
			this._handles.shift().destroy();
		}

		return Promise.resolve();
	}

	protected _handleEvent(event: Event) {
		this._controller.enqueue(event);
	}
}
