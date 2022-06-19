import { $, $$ } from '@sciter';
import { fs } from '@sys';
import { showTrayIcon } from './tray.js';

const STATE = {
  logs: [],
  closeAboutWindow: () => {},
  screenshot: null,
  isCropping: false,
  isResizing: false,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  resizeHandle: null,
  cropArea: {
    x1: -999,
    y1: -999,
    x2: -999,
    y2: -999,
    origin: function () {
      return { x: Math.min(this.x1, this.x2), y: Math.min(this.y1, this.y2) };
    },
    size: function () {
      const { x, y } = this.origin();
      return {
        width: Math.max(this.x1, this.x2) - x,
        height: Math.max(this.y1, this.y2) - y,
      };
    },
    corners: function () {
      const origin = this.origin();
      const size = this.size();
      return [
        { x: origin.x, y: origin.y, cursor: 'nw-resize' },
        { x: origin.x + size.width, y: origin.y, cursor: 'ne-resize' },
        {
          x: origin.x + size.width,
          y: origin.y + size.height,
          cursor: 'se-resize',
        },
        { x: origin.x, y: origin.y + size.height, cursor: 'sw-resize' },
      ];
    },
    midpoints: function () {
      const origin = this.origin();
      const size = this.size();
      return [
        { x: origin.x + size.width / 2, y: origin.y, cursor: 'n-resize' },
        {
          x: origin.x + size.width,
          y: origin.y + size.height / 2,
          cursor: 'e-resize',
        },
        {
          x: origin.x + size.width / 2,
          y: origin.y + size.height,
          cursor: 's-resize',
        },
        { x: origin.x, y: origin.y + size.height / 2, cursor: 'w-resize' },
      ];
    },
  },
};

const _log = console.log;
const _err = console.error;

console.log = function (txt) {
  _log(txt);
  STATE.logs.push(txt);
};

console.err = function (txt) {
  _err(txt);
  STATE.logs.push(txt);
};

main();

async function main() {
  showTrayIcon();
  $('(screenshot)').on('click', screenshot);
  $('(about)').on('click', () => {
    STATE.closeAboutWindow();
    Window.this.modal({ url: './html/about.html', parameters: { STATE } });
  });
  $('#move').on('click', (evt, el) => {
    if (el.state.checked) {
      $('#crop-area').classList.add('movable');
    } else {
      $('#crop-area').classList.remove('movable');
      $('#crop-area').style.cursor = 'unset';
    }
  });

  const performAnimation = () => {
    requestAnimationFrame(performAnimation);

    const json1 = JSON.stringify(STATE);
    const obj = JSON.parse(json1);
    delete obj.logs;
    delete obj.cropArea;
    const json2 = JSON.stringify(obj);
    //console.log(json2);
    //STATE.logs = [json2];

    const { cropArea } = STATE;
    $('#crop-area').style.left = cropArea.origin().x;
    $('#crop-area').style.top = cropArea.origin().y;
    $('#crop-area').style.width = cropArea.size().width;
    $('#crop-area').style.height = cropArea.size().height;

    $('#buttons').style.top = cropArea.origin().y + cropArea.size().height + 7;
    $('#buttons').style.left = cropArea.origin().x + cropArea.size().width / 2;

    if (!STATE.isHoveringHandle) {
      document.style.cursor = 'crosshair';
    }

    if (
      $('.movable') &&
      STATE.isDragging &&
      !STATE.isHoveringHandle &&
      !STATE.isResizing
    ) {
      $('.movable').style.cursor = "url('./cur/grabbing.cur')";
    }

    if (
      $('.movable') &&
      !STATE.isDragging &&
      !STATE.isHoveringHandle &&
      !STATE.isResizing
    ) {
      $('.movable').style.cursor = "url('./cur/grab.cur')";
    }

    if (STATE.isHoveringHandle || STATE.isResizing) {
      $('#crop-area').style.cursor = 'unset';
    }
  };

  requestAnimationFrame(performAnimation);
}

function screenshot() {
  const screenshot = Window.this.screenBox('snapshot');
  STATE.screenshot = screenshot;

  STATE.closeAboutWindow();

  Window.this.state = Window.WINDOW_FULL_SCREEN;

  Window.this.isTopmost = true;

  document.style.cursor = 'crosshair';

  $('#canvas').paintBackground = function (ctx) {
    ctx.draw(screenshot);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, screenshot.width, screenshot.height);

    const { cropArea } = STATE;
    const { x, y } = cropArea.origin();
    const { width, height } = cropArea.size();

    ctx.draw(screenshot, {
      x,
      y,
      width,
      height,
      srcX: x,
      srcY: y,
      srcWidth: width,
      srcHeight: height,
    });

    ctx.strokeWidth = 1;
    ctx.strokeStyle = '#8300A9';
    //ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = '#8300A9';

    // resize handles on corners

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + width, y, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y + height, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + width, y + height, 5, 0, 360);
    ctx.fill();

    // resize handles on center of sides

    ctx.beginPath();
    ctx.arc(x + width / 2, y, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + width, y + height / 2, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + width / 2, y + height, 5, 0, 360);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y + height / 2, 5, 0, 360);
    ctx.fill();

    //ctx.fillStyle = 'white';
    //ctx.fillText(STATE.logs.slice(-1)[0], 12, 12, 9999);

    this.requestPaint();
  };
}

$('#canvas').on('mousedown', (evt, el) => {
  if (evt.button != 1) {
    return;
  }

  if (el.classList.contains('movable') && !STATE.isHoveringHandle) {
    STATE.dragOffset = {
      x: evt.x - STATE.cropArea.origin().x,
      y: evt.y - STATE.cropArea.origin().y,
    };
    STATE.isDragging = true;
    return;
  }

  if (document.style.cursor.includes('resize')) {
    STATE.isResizing = true;
    return;
  }

  if (!STATE.isCropping) {
    STATE.isCropping = true;
    $('#crop-area').classList.add('visible');
    $('#buttons').classList.add('visible');

    STATE.cropArea.x1 = evt.x;
    STATE.cropArea.y1 = evt.y;
    STATE.cropArea.x2 = evt.x;
    STATE.cropArea.y2 = evt.y;
  }
});

$('#canvas').on('mouseup', (evt, el) => {
  if (evt.button != 1) {
    return;
  }

  if (STATE.isCropping) {
    STATE.isCropping = false;
  }

  if (STATE.isResizing) {
    STATE.isResizing = false;
    document.style.cursor = 'crosshair';
  }

  if (STATE.isDragging) {
    STATE.isDragging = false;
  }
});

$('#canvas').on('mousemove', (evt, el) => {
  const { cropArea } = STATE;

  if (STATE.isDragging && evt.button === 1) {
    const { width, height } = cropArea.size();

    const { screenshot } = STATE;

    cropArea.x1 = evt.x - STATE.dragOffset.x;
    cropArea.y1 = evt.y - STATE.dragOffset.y;
    cropArea.x2 = cropArea.x1 + width;
    cropArea.y2 = cropArea.y1 + height;

    const { x1, y1, x2, y2 } = cropArea;
    if (x1 <= 0) cropArea.x1 = 0;
    if (y1 <= 0) cropArea.y1 = 0;
    if (x2 >= screenshot.width) cropArea.x1 = screenshot.width - width;
    if (y2 >= screenshot.height) cropArea.y1 = screenshot.height - height;

    cropArea.x2 = cropArea.x1 + width;
    cropArea.y2 = cropArea.y1 + height;

    return;
  }

  if (!STATE.isCropping) {
    const corners = cropArea.corners();
    const midpoints = cropArea.midpoints();
    const handles = [...corners, ...midpoints];

    STATE.isHoveringHandle = false;

    for (const handle of handles) {
      const distance = distanceBetween(evt, handle);
      if (distance < 10) {
        STATE.isHoveringHandle = true;
        document.style.cursor = handle.cursor;
        STATE.resizeHandle = handle;
        break;
      }
    }
  }

  if (evt.button != 1) {
    return;
  }

  if (STATE.isResizing) {
    switch (STATE.resizeHandle.cursor) {
      case 'nw-resize': {
        cropArea.x1 = evt.x;
        cropArea.y1 = evt.y;
        break;
      }
      case 'n-resize': {
        cropArea.y1 = evt.y;
        break;
      }
      case 'ne-resize': {
        cropArea.x2 = evt.x;
        cropArea.y1 = evt.y;
        break;
      }
      case 'e-resize': {
        cropArea.x2 = evt.x;
        break;
      }
      case 'se-resize': {
        cropArea.x2 = evt.x;
        cropArea.y2 = evt.y;
        break;
      }
      case 's-resize': {
        cropArea.y2 = evt.y;
        break;
      }
      case 'sw-resize': {
        cropArea.x1 = evt.x;
        cropArea.y2 = evt.y;
        break;
      }
      case 'w-resize': {
        cropArea.x1 = evt.x;
        break;
      }
      default: {
        break;
      }
    }
  } else {
  }

  if (!STATE.isCropping) {
    return;
  }

  cropArea.x2 = evt.x;
  cropArea.y2 = evt.y;
});

function distanceBetween(start, finish) {
  return Math.hypot(finish.x - start.x, finish.y - start.y);
}

$('#close').on('click', () => {
  $('#move').state.checked = false;
  $('.movable')?.classList.remove('movable');

  $('#crop-area').classList.remove('visible');
  $('#buttons').classList.remove('visible');
  STATE.cropArea.x1 = -999;
  STATE.cropArea.y1 = -999;
  STATE.cropArea.x2 = -999;
  STATE.cropArea.y2 = -999;

  Window.this.state = Window.WINDOW_MINIMIZED;

  Window.this.state = Window.WINDOW_HIDDEN;
});

$('#save').on('click', () => {
  const filename = Window.this
    .selectFile({
      mode: 'save',
      filter: 'PNG (*.png)|*.png|JPEG (*.jpg; *.jpeg)|*.jpg;*.jpeg',
      caption: 'Save screenshot',
      extension: 'png',
    })
    ?.replace('file://', '');

  if (filename) {
    const { screenshot } = STATE;
    const { width, height } = STATE.cropArea.size();
    const { x, y } = STATE.cropArea.origin();

    const image = new Graphics.Image(width, height, (ctx) => {
      ctx.draw(screenshot, {
        x: 0,
        y: 0,
        width,
        height,
        srcX: x,
        srcY: y,
        srcWidth: width,
        srcHeight: height,
      });
    });
    const [ext] = filename.split('.').reverse();
    const bytes = image.toBytes(ext.replace('jpg', 'jpeg'));
    const file = fs.$open(filename, 'w', 0o666);
    file.write(bytes);
    file.close();
    $('#close').click();
  }
});
