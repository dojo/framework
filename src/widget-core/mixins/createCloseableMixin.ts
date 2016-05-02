import { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, State, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';

export interface CloseableState extends State {
	closeable?: boolean;
}

export interface CloseEvent extends TargettedEventObject {
	target: Closeable<CloseableState>;
	type: 'close';
	preventDefault(): void;
}

export interface Closeable<S extends CloseableState> extends Stateful<S> {
	close(): Promise<boolean>;

	on(type: 'close', listener: EventedListener<CloseEvent>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export interface CloseableMixinFactory extends ComposeFactory<Closeable<CloseableState>, StatefulOptions<CloseableState>> { }

const createCloseableMixin: CloseableMixinFactory = createStateful
	.mixin({
		mixin: {
			close(): Promise<boolean> {
				const closeable: Closeable<CloseableState> = this;
				if (closeable.state.closeable) {
					let prevented = false;
					closeable.emit({
						type: 'close',
						target: closeable,
						preventDefault() {
							prevented = true;
						}
					});
					return prevented ? Promise.resolve(false) : closeable.destroy();
				}
				return Promise.resolve(false);
			}
		}
	});

export default createCloseableMixin;
