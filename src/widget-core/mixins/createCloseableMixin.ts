import { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, State, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
import createCancelableEvent, { CancelableEvent } from '../util/createCancelableEvent';

export interface CloseableState extends State {
	/**
	 * Determines if the widget is closeable or not
	 */
	closeable?: boolean;
}

export interface CloseEvent extends CancelableEvent<'close', CloseableMixin<CloseableState>> { }

export interface Closeable {
	/**
	 * Attempt to close the widget
	 */
	close(): Promise<boolean>;

	on(type: 'close', listener: EventedListener<CloseEvent>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type CloseableMixin<S extends CloseableState> = Stateful<S> & Closeable;

export interface CloseableMixinFactory extends ComposeFactory<CloseableMixin<CloseableState>, StatefulOptions<CloseableState>> { }

const createCloseableMixin: CloseableMixinFactory = createStateful
	.mixin({
		mixin: {
			close(): Promise<boolean> {
				const closeable: CloseableMixin<CloseableState> = this;
				if (closeable.state.closeable) {
					const event = createCancelableEvent({ type: 'close', target: closeable });
					closeable.emit(event);
					return event.defaultPrevented ? Promise.resolve(false) : closeable.destroy();
				}
				return Promise.resolve(false);
			}
		}
	});

export default createCloseableMixin;
