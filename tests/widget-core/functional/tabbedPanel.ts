import createTabbedPanel from 'src/createTabbedPanel';
import createPanel from 'src/createPanel';
import createWidget from 'src/createWidget';
import projector from 'src/projector';

const tabbedPanel = createTabbedPanel();

const tab1 = createPanel({
	state: { label: 'tab 1', closeable: true }
});

tab1.append(createWidget({
	state: { label: JSON.stringify({ id: 'tab1' }) }
}));

tabbedPanel.append(tab1);

const tab2 = createPanel({
	state: { label: 'tab 2' }
});

tab2.append(createWidget({
	state: { label: JSON.stringify({ id: 'tab2' }) }
}));

tabbedPanel.append(tab2);

const tab3 = createPanel({
	state: { label: 'tab 3' }
});

tab3.append(createWidget({
	state: { label: JSON.stringify({ id: 'tab3' }) }
}));

tabbedPanel.append(tab3);

const tab4 = createPanel({
	state: { label: 'tab 4', closeable: true }
});

tab4.append(createWidget({
	state: { label: JSON.stringify({ id: 'tab4' }) }
}));

tabbedPanel.append(tab4);

projector.append(tabbedPanel);

projector.attach();

document.getElementsByTagName('body')[0].className += ' loaded';
