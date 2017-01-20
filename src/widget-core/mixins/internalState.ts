import { State, Stateful, StatefulOptions } from '@dojo/interfaces/bases';
import createStateful from '@dojo/compose/bases/createStateful';
import { ComposeFactory } from '@dojo/compose/compose';

export type InternalState = Stateful<State> & {
	invalidate(): void;
}

export interface InternalStateFactory extends ComposeFactory<Stateful<State>, StatefulOptions<State>> {}

const internalStateFactory: InternalStateFactory = createStateful.mixin({
	initialize(instance: InternalState) {
		instance.own(instance.on('state:changed', () => {
			instance.invalidate();
		}));
	}
});

export default internalStateFactory;
