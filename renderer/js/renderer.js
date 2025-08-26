const form = document.querySelector('#img-form');
const img = document.querySelector('#img');
const outputPath = document.querySelector('#output-path');
const filename = document.querySelector('#filename');
const heightInput = document.querySelector('#height');
const widthInput = document.querySelector('#width');
const lockAspect = document.querySelector('#lock-aspect');
const outputSave = document.querySelector('#output-save');
const outputClipboard = document.querySelector('#output-clipboard');

let originalWidth = null;
let originalHeight = null;

// When pasting from clipboard, we keep data here
let clipboardPayload = null; // { arrayBuffer, width, height, suggestedName }

function loadImage(e) {
  const file = e.target.files[0];
  if (!isFileImage(file)) {
    alertError('Please select an image file instead');
    return;
  }

  clipboardPayload = null; // clear any clipboard source

  // get original image dimensions
  const image = new Image();
  image.src = URL.createObjectURL(file);
  image.onload = function () {
    originalWidth = this.width;
    originalHeight = this.height;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
  };

  form.style.display = 'block';
  filename.innerText = file.name;
  outputPath.innerText = path.join(os.homedir(), 'imageresizer');
}

// Paste support (Windows + macOS)
window.addEventListener('paste', async () => {
  try {
    const clip = await window.electronClipboard.readImage();
    if (!clip) {
      alertError('Clipboard does not contain an image.');
      return;
    }

    // populate controls
    clipboardPayload = clip;
    originalWidth = clip.width;
    originalHeight = clip.height;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;

    form.style.display = 'block';
    filename.innerText = clip.suggestedName || 'clipboard.png';
    outputPath.innerText = path.join(os.homedir(), 'imageresizer');

    // Clear file input so we know source is clipboard
    if (img) img.value = '';
    alertSuccess('Pasted image captured from clipboard.');
  } catch (err) {
    alertError('Could not read image from clipboard.');
    console.error(err);
  }
});

// Keep aspect ratio while typing (both directions)
function coerceInt(val) {
  const n = Math.max(1, Math.floor(Number(val || 0)));
  return Number.isFinite(n) ? n : 1;
}

widthInput.addEventListener('input', () => {
  if (!lockAspect.checked || !originalWidth || !originalHeight) return;
  const w = coerceInt(widthInput.value);
  const h = Math.round((originalHeight / originalWidth) * w);
  heightInput.value = h;
});

heightInput.addEventListener('input', () => {
  if (!lockAspect.checked || !originalWidth || !originalHeight) return;
  const h = coerceInt(heightInput.value);
  const w = Math.round((originalWidth / originalHeight) * h);
  widthInput.value = w;
});

// send image data to main process
async function sendImage(e) {
  e.preventDefault();

  const width = coerceInt(widthInput.value);
  const height = coerceInt(heightInput.value);

  if (!width || !height) {
    alertError("Please fill in a height and width value");
    return;
  }

  // Determine output mode
  const outputMode = outputClipboard.checked ? 'clipboard' : 'save';

  let fileData, displayName;

  if (clipboardPayload && clipboardPayload.arrayBuffer) {
    fileData = clipboardPayload.arrayBuffer; // Already an ArrayBuffer
    displayName = clipboardPayload.suggestedName || 'clipboard.png';
  } else {
    // File input path
    if (!img.files[0]) {
      alertError("Please upload an image file or paste one (Ctrl/⌘+V)");
      return;
    }
    const file = img.files[0];
    displayName = file.name;

    // Validate again
    if (!isFileImage(file)) {
      alertError('Please select an image file instead');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    fileData = arrayBuffer;
  }

  ipcRenderer.send('image:resize', {
    fileData,
    filename: displayName,
    width,
    height,
    outputMode, // 'save' or 'clipboard'
  });
}

//make sure file is image
function isFileImage(file) {
  const acceptedImageTypes = ['image/gif', 'image/png', 'image/jpeg'];
  return file && acceptedImageTypes.includes(file['type']);
}

//alert error
function alertError(message) {
  Toastify.toast({
    text: message,
    duration: 5000,
    close: false,
    style: {
      background: 'red',
      color: 'white',
      textAlign: 'center',
    }
  })
};

//alert success
function alertSuccess(message) {
  Toastify.toast({
    text: message,
    duration: 3000,
    close: false,
    style: {
      background: 'green',
      color: 'white',
      textAlign: 'center',
    }
  })
};

img.addEventListener('change', loadImage)
form.addEventListener('submit', sendImage);

// Optional: feedback from main
ipcRenderer.on('image:done', () => {
  if (outputClipboard.checked) {
    alertSuccess('Resized image copied to clipboard.');
  } else {
    alertSuccess('Image resized and saved.');
  }
});

ipcRenderer.on('image:error', (msg) => {
  alertError(msg || 'Image resize failed.');
});
