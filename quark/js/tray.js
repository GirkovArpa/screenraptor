import { $, $$ } from '@sciter';

export async function showTrayIcon() {
  Window.this.trayIcon({
    image: await Graphics.Image.load('this://app/png/logo/16.png'),
    text: 'Flameshot',
  });
}

Window.this.on('trayiconclick', ({ data }) => {
  const [sx, sy] = Window.this.box('position', 'client', 'screen');
  const menu = document.$('menu#tray');
  const { screenX, screenY } = data;
  menu.popupAt(screenX - sx, screenY - sy, 2);
});

$('(quit)').on('click', () => Window.this.close());
