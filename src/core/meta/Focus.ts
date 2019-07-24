import { Base } from './Base';
import global from '../../shim/global';

export interface FocusResults {
	active: boolean;
	containsFocus: boolean;
}

const defaultResults = {
	active: false,
	containsFocus: false
};

export class Focus extends Base {
	private _activeElement: Element | undefined;

	public get(key: string | number): FocusResults {
		const node = this.getNode(key);

		if (!node) {
			return { ...defaultResults };
		}

		if (!this._activeElement) {
			this._activeElement = global.document.activeElement;
			this._createListener();
		}

		return {
			active: node === this._activeElement,
			containsFocus: !!this._activeElement && node.contains(this._activeElement)
		};
	}

	public set(key: string | number) {
		const node = this.getNode(key);
		node && (node as HTMLElement).focus();
	}

	private _onFocusChange = () => {
		this._activeElement = global.document.activeElement;
		this.invalidate();
	};

	private _createListener() {
		global.document.addEventListener('focusin', this._onFocusChange);
		global.document.addEventListener('focusout', this._onFocusChange);
		this.own({
			destroy: () => {
				this._removeListener();
			}
		});
	}

	private _removeListener() {
		global.document.removeEventListener('focusin', this._onFocusChange);
		global.document.removeEventListener('focusout', this._onFocusChange);
	}
}

export default Focus;
