const form = document.querySelector('#img-form');
const img = document.querySelector('#img');
const outputPath = document.querySelector('#output-path');
const filename = document.querySelector('#filename');
const heightInput = document.querySelector('#height');
const widthInput = document.querySelector('#width');

function loadImage(e) {
    const file = e.target.files[0];
    if (!isFileImage(file)) {
        alertError('Please select an image file instead');
        return;
    }

    //get original image dimensions
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = function () {
        widthInput.value = this.width;
        heightInput.value = this.height;
    }

    form.style.display = 'block'; 
    filename.innerText = file.name;
    outputPath.innerText = path.join(os.homedir(), 'imageresizer');
}


//send image data to main process
async function sendImage(e) {
  e.preventDefault();

  //alert user if they're trying to upload a non-image file type
  if (!img.files[0]) {
    alertError("Please upload an image file");
    return;
  }

  //define width and height
  const width = widthInput.value;
  const height = heightInput.value;

  //alert if width or height are blank 
  if (width === '' || height === '') {
    alertError("Please fill in a height and width value");
    return;
  }

  const file = img.files[0];
  const arrayBuffer = await file.arrayBuffer();   // <- no Buffer here

  ipcRenderer.send('image:resize', {
    fileData: arrayBuffer,       // <- send ArrayBuffer
    filename: file.name,
    width,
    height,
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
        duration: 5000,
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