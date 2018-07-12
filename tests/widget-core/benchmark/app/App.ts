import { DNode } from '../../../src/interfaces';
import { WidgetBase } from '../../../src/WidgetBase';
import { v, w } from '../../../src/d';

import { Row } from './Row';
import { Buttons, ButtonConfig } from './Buttons';
import { Store } from './Store';

export class App extends WidgetBase {
	private _store: Store = new Store();

	private _run = () => {
		this._store.run();
		this.invalidate();
	};

	private _add = () => {
		this._store.add();
		this.invalidate();
	};

	private _update = () => {
		this._store.update();
		this.invalidate();
	};

	private _select = (id: number) => {
		this._store.select(id);
		this.invalidate();
	};

	private _delete = (id: number) => {
		this._store.delete(id);
		this.invalidate();
	};

	private _runLots = () => {
		this._store.runLots();
		this.invalidate();
	};

	private _clear = () => {
		this._store.clear();
		this.invalidate();
	};

	private _swapRows = () => {
		this._store.swapRows();
		this.invalidate();
	};

	private _buttonConfigs: ButtonConfig[] = [
		{ id: 'run', label: 'Create 1,000 rows', onClick: this._run },
		{ id: 'runlots', label: 'Create 10,000 rows', onClick: this._runLots },
		{ id: 'add', label: 'Append 1,000 rows', onClick: this._add },
		{ id: 'update', label: 'Update every 10th row', onClick: this._update },
		{ id: 'clear', label: 'Clear', onClick: this._clear },
		{ id: 'swaprows', label: 'Swap Rows', onClick: this._swapRows }
	];

	protected render(): DNode {
		const { _select, _delete, _store } = this;
		const rows = _store.data.map(({ id, label }, index) => {
			return w(Row, {
				id,
				key: id,
				label,
				onRowSelected: _select,
				onRowDeleted: _delete,
				selected: id === _store.selected
			});
		});

		return v('div', { key: 'root', classes: ['container'] }, [
			w(Buttons, { buttonConfigs: this._buttonConfigs }),
			v('table', { classes: ['table', 'table-hover', 'table-striped', 'test-data'] }, [v('tbody', rows)]),
			v('span', { classes: ['preloadicon', 'glyphicon', 'glyphicon-remove'] })
		]);
	}
}

export default App;
