let startTime: any;
let lastMeasure: any;
let startMeasure = function(name: any) {
	startTime = performance.now();
	lastMeasure = name;
};

let stopMeasure = function() {
	let last = lastMeasure;
	if (lastMeasure) {
		window.setTimeout(function() {
			lastMeasure = null;
			let stop = performance.now();
			console.log(last + ' took ' + (stop - startTime));
		}, 0);
	}
};

function _random(max: any) {
	return Math.round(Math.random() * 1000) % max;
}

class Store {
	data: any;
	backup: any;
	selected: any;
	id: any;

	constructor() {
		this.data = [];
		this.backup = null;
		this.selected = null;
		this.id = 1;
	}
	buildData(count = 1000) {
		let adjectives = [
			'pretty',
			'large',
			'big',
			'small',
			'tall',
			'short',
			'long',
			'handsome',
			'plain',
			'quaint',
			'clean',
			'elegant',
			'easy',
			'angry',
			'crazy',
			'helpful',
			'mushy',
			'odd',
			'unsightly',
			'adorable',
			'important',
			'inexpensive',
			'cheap',
			'expensive',
			'fancy'
		];
		let colours = [
			'red',
			'yellow',
			'blue',
			'green',
			'pink',
			'brown',
			'purple',
			'brown',
			'white',
			'black',
			'orange'
		];
		let nouns = [
			'table',
			'chair',
			'house',
			'bbq',
			'desk',
			'car',
			'pony',
			'cookie',
			'sandwich',
			'burger',
			'pizza',
			'mouse',
			'keyboard'
		];
		let data = [];
		for (let i = 0; i < count; i++) {
			data.push({
				id: this.id++,
				label:
					adjectives[_random(adjectives.length)] +
					' ' +
					colours[_random(colours.length)] +
					' ' +
					nouns[_random(nouns.length)]
			});
		}
		return data;
	}
	updateData(mod = 10) {
		for (let i = 0; i < this.data.length; i += 10) {
			this.data[i].label += ' !!!';
			// this.data[i] = Object.assign({}, this.data[i], {label: this.data[i].label +' !!!'});
		}
	}
	delete(id: any) {
		const idx = this.data.findIndex((d: any) => d.id === id);
		this.data = this.data.filter((e: any, i: any) => i !== idx);
		return this;
	}
	run() {
		this.data = this.buildData();
		this.selected = null;
	}
	add() {
		this.data = this.data.concat(this.buildData(1000));
		this.selected = null;
	}
	update() {
		this.updateData();
		this.selected = null;
	}
	select(id: any) {
		this.selected = id;
	}
	hideAll() {
		this.backup = this.data;
		this.data = [];
		this.selected = null;
	}
	showAll() {
		this.data = this.backup;
		this.backup = null;
		this.selected = null;
	}
	runLots() {
		this.data = this.buildData(10000);
		this.selected = null;
	}
	clear() {
		this.data = [];
		this.selected = null;
	}
	swapRows() {
		if (this.data.length > 10) {
			let a = this.data[4];
			this.data[4] = this.data[9];
			this.data[9] = a;
		}
	}
}

let td = function(className: any) {
	let td = document.createElement('td');
	td.className = className;
	return td;
};

let getParentId = function(elem: any) {
	while (elem) {
		if (elem.tagName === 'TR') {
			return elem.data_id;
		}
		elem = elem.parentNode;
	}
	return undefined;
};
class Main {
	store: any;
	start: any;
	rows: any;
	data: any;
	selectedRow: any;
	tbody: any;

	constructor() {
		this.store = new Store();
		this.select = this.select.bind(this);
		this.delete = this.delete.bind(this);
		this.add = this.add.bind(this);
		this.run = this.run.bind(this);
		this.update = this.update.bind(this);
		this.start = 0;
		this.rows = [];
		this.data = [];
		this.selectedRow = undefined;

		const mainEl = document.getElementById('main');
		if (mainEl) {
			mainEl.addEventListener('click', (e) => {
				const currentTarget = <HTMLElement>e.target;
				if (currentTarget.matches('#add')) {
					e.preventDefault();
					this.add();
				} else if (currentTarget.matches('#run')) {
					e.preventDefault();
					this.run();
				} else if (currentTarget.matches('#update')) {
					e.preventDefault();
					this.update();
				} else if (currentTarget.matches('#hideall')) {
					e.preventDefault();
					// this.hideAll();
				} else if (currentTarget.matches('#showall')) {
					e.preventDefault();
					// this.showAll();
				} else if (currentTarget.matches('#runlots')) {
					e.preventDefault();
					this.runLots();
				} else if (currentTarget.matches('#clear')) {
					e.preventDefault();
					this.clear();
				} else if (currentTarget.matches('#swaprows')) {
					e.preventDefault();
					this.swapRows();
				} else if (currentTarget.matches('.remove')) {
					e.preventDefault();
					let id = getParentId(currentTarget);
					let idx = this.findIdx(id);
					this.delete(idx);
				} else if (currentTarget.matches('.lbl')) {
					e.preventDefault();
					let id = getParentId(currentTarget);
					let idx = this.findIdx(id);
					this.select(idx);
				}
			});
		}

		this.tbody = document.getElementById('tbody');
	}
	findIdx(id: any) {
		for (let i = 0; i < this.data.length; i++) {
			if (this.data[i].id === id) {
				return i;
			}
		}
		return undefined;
	}
	printDuration() {
		stopMeasure();
	}
	run() {
		startMeasure('run');
		this.store.run();
		this.updateRows();
		this.appendRows();
		this.unselect();
		stopMeasure();
	}
	add() {
		startMeasure('add');
		this.store.add();
		this.appendRows();
		stopMeasure();
	}
	update() {
		startMeasure('update');
		this.store.update();
		// this.updateRows();
		for (let i = 0; i < this.data.length; i += 10) {
			this.rows[i].childNodes[1].childNodes[0].innerText = this.store.data[i].label;
		}
		stopMeasure();
	}
	unselect() {
		if (this.selectedRow !== undefined) {
			this.selectedRow.className = '';
			this.selectedRow = undefined;
		}
	}
	select(idx: any) {
		startMeasure('select');
		this.unselect();
		this.store.select(this.data[idx].id);
		this.selectedRow = this.rows[idx];
		this.selectedRow.className = 'danger';
		stopMeasure();
	}
	delete(idx: any) {
		startMeasure('delete');
		// Remove that row from the DOM
		// this.store.delete(this.data[idx].id);
		// this.rows[idx].remove();
		// this.rows.splice(idx, 1);
		// this.data.splice(idx, 1);

		// Faster, shift all rows below the row that should be deleted rows one up and drop the last row
		for (let i = this.rows.length - 2; i >= idx; i--) {
			let tr = this.rows[i];
			let data = this.store.data[i + 1];
			tr.data_id = data.id;
			tr.childNodes[0].innerText = data.id;
			tr.childNodes[1].childNodes[0].innerText = data.label;
			this.data[i] = this.store.data[i];
		}
		this.store.delete(this.data[idx].id);
		this.data.splice(idx, 1);
		this.rows.pop().remove();

		stopMeasure();
	}
	updateRows() {
		for (let i = 0; i < this.rows.length; i++) {
			if (this.data[i] !== this.store.data[i]) {
				let tr = this.rows[i];
				let data = this.store.data[i];
				tr.data_id = data.id;
				tr.childNodes[0].innerText = data.id;
				tr.childNodes[1].childNodes[0].innerText = data.label;
				this.data[i] = this.store.data[i];
			}
		}
	}
	removeAllRows() {
		// ~258 msecs
		// for(let i=this.rows.length-1;i>=0;i--) {
		//     tbody.removeChild(this.rows[i]);
		// }
		// ~251 msecs
		// for(let i=0;i<this.rows.length;i++) {
		//     tbody.removeChild(this.rows[i]);
		// }
		// ~216 msecs
		// var cNode = tbody.cloneNode(false);
		// tbody.parentNode.replaceChild(cNode ,tbody);
		// ~212 msecs
		this.tbody.textContent = '';

		// ~236 msecs
		// var rangeObj = new Range();
		// rangeObj.selectNodeContents(tbody);
		// rangeObj.deleteContents();
		// ~260 msecs
		// var last;
		// while (last = tbody.lastChild) tbody.removeChild(last);
	}
	runLots() {
		startMeasure('runLots');
		this.store.runLots();
		this.updateRows();
		this.appendRows();
		this.unselect();
		stopMeasure();
	}
	clear() {
		startMeasure('clear');
		this.store.clear();
		this.rows = [];
		this.data = [];
		requestAnimationFrame(() => {
			this.removeAllRows();
			this.unselect();
			stopMeasure();
		});
	}
	swapRows() {
		startMeasure('swapRows');
		let oldSelection = this.store.selected;
		this.store.swapRows();
		this.updateRows();
		this.unselect();
		if (oldSelection >= 0) {
			let idx = this.store.data.findIndex((d: any) => d.id === oldSelection);
			if (idx > 0) {
				this.store.select(this.data[idx].id);
				this.selectedRow = this.rows[idx];
				this.selectedRow.className = 'danger';
			}
		}
		stopMeasure();
	}
	appendRows() {
		// Using a document fragment is slower...
		// var docfrag = document.createDocumentFragment();
		// for(let i=this.rows.length;i<this.store.data.length; i++) {
		//     let tr = this.createRow(this.store.data[i]);
		//     this.rows[i] = tr;
		//     this.data[i] = this.store.data[i];
		//     docfrag.appendChild(tr);
		// }
		// this.tbody.appendChild(docfrag);

		// ... than adding directly
		let rows = this.rows,
			sData = this.store.data,
			data = this.data,
			tbody = this.tbody;
		for (let i = rows.length; i < sData.length; i++) {
			let tr = this.createRow(sData[i]);
			rows[i] = tr;
			data[i] = sData[i];
			tbody.appendChild(tr);
		}
	}
	createRow(data: any) {
		let tr = <any>document.createElement('tr');
		tr.data_id = data.id;
		let td1 = td('col-md-1');
		td1.innerText = data.id;
		tr.appendChild(td1);

		let td2 = td('col-md-4');
		tr.appendChild(td2);
		let a2 = document.createElement('a');
		a2.className = 'lbl';
		td2.appendChild(a2);
		a2.innerText = data.label;

		let td3 = td('col-md-1');
		tr.appendChild(td3);
		let a = document.createElement('a');
		a.className = 'remove';
		td3.appendChild(a);
		let span = document.createElement('span');
		span.className = 'glyphicon glyphicon-remove remove';
		span.setAttribute('aria-hidden', 'true');
		a.appendChild(span);

		let td5 = td('col-md-6');
		tr.appendChild(td5);

		return tr;
	}
}

new Main();
