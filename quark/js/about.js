import { $, $$ } from '@sciter';
import { launch } from '@env';

const aboutWindow = Window.this;

Window.this.parameters.STATE.closeAboutWindow = function () {
  aboutWindow.close();
}

$('#flameshot').on('click', () => {
  launch('https://flameshot.org/?ref=screenraptor');
});

$('#sciter').on('click', () => {
  launch('https://sciter.com/?ref=screenraptor');
});

$('#terra-informatica').on('click', () => {
  launch('https://terrainformatica.com/?ref=screenraptor');
});

$('#girkov-arpa').on('click', () => {
  launch('https://girkovarpa.itch.io/?ref=screenraptor');
});

$('button').on('click', () => Window.this.close());
