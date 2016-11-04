import { ComposeFactory } from 'dojo-compose/compose';
import createCancelableEvent from 'dojo-compose/bases/createCancelableEvent';
import createStateful from 'dojo-compose/bases/createStateful';
import { EventCancelableObject, EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { EventedListener, Stateful, State, StatefulOptions } from 'dojo-interfaces/bases';
import Promise from 'dojo-shim/Promise';

export interface CloseableState extends State {
	/**
	 * Determines if the widget is closeable or not
	 */
	closeable?: boolean;
}

export interface CloseEvent extends EventCancelableObject<'close', CloseableMixin<CloseableState>> { }

export interface Closeable {
	/**
	 * Attempt to close the widget
	 */
	close(): Promise<boolean>;

	on(type: 'close', listener: EventedListener<CloseableMixin<CloseableState>, CloseEvent>): Handle;
	on(type: string, listener: EventedListener<CloseableState, EventTargettedObject<CloseableState>>): Handle;
}

export type CloseableMixin<S extends CloseableState> = Stateful<S> & Closeable;

export interface CloseableMixinFactory extends ComposeFactory<CloseableMixin<CloseableState>, StatefulOptions<CloseableState>> { }

const createCloseableMixin: CloseableMixinFactory = createStateful
	.mixin({
		mixin: {
			close(this: CloseableMixin<CloseableState>): Promise<boolean> {
				if (this.state.closeable) {
					const event = createCancelableEvent({ type: 'close', target: this });
					this.emit(event);
					return event.defaultPrevented ? Promise.resolve(false) : this.destroy();
				}
				return Promise.resolve(false);
			}
		}
	});

export default createCloseableMixin;
