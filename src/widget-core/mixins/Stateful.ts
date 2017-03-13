import { deepAssign } from '@dojo/core/lang';
import { Constructor, WidgetProperties } from './../interfaces';
import { WidgetBase } from './../WidgetBase';

/**
 * State
 */
export interface State {
	[key: string]: any;
}

/**
 * Stateful interface
 */
export interface StatefulMixin {

	/**
	 * state property
	 */
	readonly state: State;

	/**
	 * Set the internal state. Accepts a partial and mixes on top of the existing state.
	 * To clear a key it needs to be specifically set to undefined.
	 *
	 * @param state state to mix over the stored state
	 */
	setState(state: Partial<State>): void;
}

/**
 * State change event type
 */
const stateChangedEventType = 'state:changed';

export function StatefulMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T): T & Constructor<StatefulMixin> {
	return class extends base {

		private _state: State;

		constructor(...args: any[]) {
			super(...args);
			this._state = Object.create(null);
			this.own(this.on('state:changed', () => {
				this.invalidate();
			}));
		}

		public get state(): State {
			return this._state;
		}

		public setState(state: Partial<State>): void {
			this._state = deepAssign({}, this._state, state);
			const eventObject = {
				type: stateChangedEventType,
				state: this._state,
				target: this
			};
			this.emit(eventObject);
		}
	};
}

export default StatefulMixin;
