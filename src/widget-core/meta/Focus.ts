import { Base } from './Base';
import { createHandle } from '@dojo/core/lang';
import global from '@dojo/shim/global';

export interface FocusResults {
	active: boolean;
	containsFocus: boolean;
}

const defaultResults = {
	active: false,
	containsFocus: false
};

export class Focus extends Base {
	private _activeElement: Element;

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
			containsFocus: node.contains(this._activeElement)
		};
	}

	public set(key: string | number) {
		const node = this.getNode(key);
		node && (node as HTMLElement).focus();
	}

	private _onFocus = () => {
		this._activeElement = global.document.activeElement;
		this.invalidate();
	};

	private _createListener() {
		global.document.addEventListener('focusin', this._onFocus);
		this.own(createHandle(this._removeListener.bind(this)));
	}

	private _removeListener() {
		global.document.removeEventListener('focusin', this._onFocus);
	}
}

export default Focus;
