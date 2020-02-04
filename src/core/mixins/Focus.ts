import { Constructor } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { diffProperty } from './../decorators/diffProperty';
import { FocusProperties } from '../interfaces';

export { FocusProperties } from '../interfaces';

export interface FocusMixin {
	focus: () => void;
	shouldFocus: () => boolean;
	properties: FocusProperties;
}

function diffFocus(previousProperty: Function, newProperty: Function) {
	const result = newProperty && newProperty();
	return {
		changed: result,
		value: newProperty
	};
}

export function FocusMixin<T extends Constructor<WidgetBase<FocusProperties>>>(Base: T): T & Constructor<FocusMixin> {
	abstract class Focus extends Base {
		public abstract properties: FocusProperties;

		private _currentToken = 0;

		private _previousToken = 0;

		@diffProperty('focus', diffFocus)
		protected isFocusedReaction() {
			this._currentToken++;
		}

		public shouldFocus = () => {
			const result = this._currentToken !== this._previousToken;
			this._previousToken = this._currentToken;
			return result;
		};

		public focus() {
			this._currentToken++;
			this.invalidate();
		}
	}
	return Focus;
}

export default FocusMixin;
