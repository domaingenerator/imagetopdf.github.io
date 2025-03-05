/**
 * PDF to Image
 * Author: A.I Raju
 * Date: 05-03-2025
 * Description: This script is used to convert PDF files to images using PDF.js library.
 * 
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';
        
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInputBtn = document.getElementById('fileInputBtn');
const previewImages = document.getElementById('previewImages');
const previewCard = document.getElementById('previewCard');
const downloadBtn = document.getElementById('downloadBtn');
const convertingStatus = document.getElementById('convertingStatus');
var convertedImageCount = '';

let convertedImages = [];

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    handleFiles(files);
});

async function handleFiles(files) {
    if (files.length === 0) {
        showToast('Please select PDF files only.');
        return;
    }
    if( files.length > 30 ) {
        showToast('You can only convert 30 PDF files at a time.', 'danger');
        return;
    }

    convertedImages = [];
    previewImages.innerHTML = '';
    downloadBtn.style.display = 'none';
    previewCard.classList.remove('d-none');
    fileInputBtn.setAttribute('disabled', true);
    showToast('<div class="spinner-border text-dark spinner-border-sm mt-1"></div> Converting PDF to Images...', 'primary');

    convertingStatus.innerHTML = `
        <div class="bg-white rounded-3 shadow-sm p-2 border mb-3">
            <div class="p-2 text-center">
                <div class="spinner-border text-dark mb-1"></div>
                <h3 class="text-center fs-5 fw-bold">Converting PDF to Images</h3>
                <span class="text-dark">Converted Images: <span class="convertedImageCount">0</span></span>
            </div>
            <div class="conversion-progress">
                <div class="progress mb-2 w-50 m-auto">
                    <div class="progress-bar bg-dark" role="progressbar" style="width: 0%">0%</div>
                </div>
            </div>
            <div class="d-block text-center mb-1">
                <button class="btn btn-danger btn-sm shadow-sm rounded-1 m-auto" style="width:180px" onclick="window.location.reload()">Cancel</button>
            </div>
        </div>
    `;

    const progress = document.querySelector('.progress-bar');
    convertedImageCount = document.querySelectorAll('.convertedImageCount');

    for (let file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const imageData = canvas.toDataURL('image/png');
                convertedImages.push({
                    name: `${file.name}-page-${pageNum}.png`,
                    data: imageData
                });

                // Create preview
                const col = document.createElement('div');
                col.className = 'col';
                col.innerHTML = `
                    <div class="image-card bg-light border shadow-sm">
                        <img src="${imageData}" class="card-img-top preview-image" data-file-name="${file.name}-page-${pageNum}.png" class="img-fluid w-50"/>
                        <div class="card-btn">
                            <button class="btn btn-sm btn-primary" title="download" onclick="downloadSingleImage('${file.name}-page-${pageNum}.png')"><i class="bi bi-download"></i></button>
                            <button class="btn btn-sm btn-danger" title="Remove this image" onclick="removeConvertedImage('${file.name}-page-${pageNum}.png')"><i class="bi bi-x"></i></button>
                        </div>
                        <h6 class="file-name">${file.name} - Page ${pageNum}</h6>
                    </div>
                `;
                previewImages.appendChild(col);
                updateProgress(progress, Math.round((convertedImages.length / (files.length * pdf.numPages)) * 100));
                convertedImageCount.forEach(el => { el.textContent = convertedImages.length; });

            }
        } catch (error) {
            showToast(`Error converting ${file.name}: ${error.message}`);
        }
    }

    convertingStatus.innerHTML = `
        <div class="py-3 bg-white rounded-3 shadow-sm border p-4 mb-3">
            <div class="p-2 text-center">
                <i class="bi bi-check-circle-fill text-success mb-2"></i>
                <h3 class="text-center fs-5 fw-bold">Conversion Completed</h3>
                <span class="text-secondary fw-bold">Total Images: <span class="convertedImageCount">${convertedImages.length}</span></span>
            </div>
        </div>
    `;
    if (convertedImages.length > 0) {
        downloadBtn.style.display = 'inline-block';
    }
    fileInputBtn.removeAttribute('disabled');
    showToast('<i class="bi bi-check-circle-fill fs-5 text-success"></i> Conversion Completed!', 'success');
}

downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    
    convertedImages.forEach(img => {
        const imageData = img.data.split(',')[1];
        zip.file(img.name, imageData, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'converted-images.zip';
    link.click();
});


function downloadSingleImage( imageName ) {
    const card = event.target.closest('.card');
    const img = card.querySelector('.preview-image');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = imageName;
    link.click();
}

function removeConvertedImage(fileName) {
    convertedImages = convertedImages.filter(img => !img.name.includes(fileName));
    const previewImages = document.querySelectorAll('.preview-image');
    previewImages.forEach(img => {
        if ( img.getAttribute('data-file-name') === fileName ) {
            img.closest('.col').remove();
        }
    });
    convertedImageCount.forEach(el => { el.textContent = convertedImages.length; });
    if (convertedImages.length === 0) {
        downloadBtn.style.display = 'none';
        previewCard.classList.add('d-none');
        convertingStatus.innerHTML = '';
        showToast('All images removed.', 'info');
    }
}

/* Utility functions */
function updateProgress(progress, parcent){
    progress.style.width = parcent + '%';
    progress.textContent = parcent + '%';
} 

/*
* error handler by bootstrap toast message
*/

// Add toast container to body
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
document.body.appendChild(toastContainer);

// Function to show toast
function showToast(message, type = 'danger') {
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
    <div id="${toastId}" class="toast border-0 shadow-sm" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">Notification</strong>
        <button type="button" class="btn-close bg-light" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body bg-white text-${type}">
        ${message}
        </div>
    </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}