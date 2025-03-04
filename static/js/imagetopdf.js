/**
 * Image to PDF Converter
 * Author: A.I Raju
 * Date: 04-03-2025
 * Description: Convert multiple images to a single PDF file using jsPDF library
 * Dependencies: jsPDF (
 *   https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js
 * )
 */

window.jsPDF = window.jspdf.jsPDF;
let uploadedFiles = [];
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 30MB

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

// Event Listeners
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', (e) => e.preventDefault());
document.getElementById('dropZone').addEventListener('drop', handleDrop);
document.getElementById('convertBtn').addEventListener('click', convertToPDF);

function handleFileSelect(e) {
    const files = e.target.files;
    if( files.length > 50 ){
        showToast('You can convert 50 images at once!');
        return;
    }
    handleFiles(files);
}

function handleDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function validateFile(file) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
        return `File "${file.name}" is not a supported image type. Supported types: JPG, PNG, GIF, BMP`;
    }
    if (file.size > MAX_FILE_SIZE) {
        return `File "${file.name}" exceeds maximum size of 15MB`;
    }
    return null;
}

function handleFiles(files) {
    const errors = [];
    uploadedFiles = Array.from(files).filter(file => {
    const error = validateFile(file);
    if (error) {
        errors.push(error);
        return false;
    }
    return true;
    });

    if (errors.length > 0) {
    errors.forEach(error => showToast(error));
    }

    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <div class="text-left mt-4 mb-3 bg-light p-3 rounded-3 shadow-sm border">
            <h3 class="fs-5 fw-bold d-block">Selected <span id="previewImgCount">${uploadedFiles.length}</span> images</h3>
            <div id="previewImageItems" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-auto g-3 m-auto justify-content-center mt-2"></div>
        </div>
    `;
    const previewImageItems = document.getElementById('previewImageItems');

    uploadedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'col';
        imgDiv.innerHTML = `
            <div class="imagePreviewCard bg-white shadow-sm">
                <img src="${e.target.result}" class="img-fluid preview-image" />
                <div class="file_info p-2">
                    <small class="d-block">${file.name}</small>
                    <small class="text-secondary">${file.type.split('/')[1].toUpperCase()} • ${(file.size / 1024).toFixed()} KB</small>
                    <span class="float-end mt-2 text-danger" tabindex="0" onclick="this.closest('.col').remove();removeImg('${file.name}')"><i class="bi bi-x"></i> Remove</span>
                </div>
            <div>
        `;
        previewImageItems.appendChild(imgDiv);
    };
    reader.readAsDataURL(file);
    });
}

function removeImg(name){
    uploadedFiles = uploadedFiles.filter( file => file.name !== name );
    if( uploadedFiles.length === 0 ){
        document.getElementById('imagePreview').innerHTML = '';
    }
    document.getElementById('previewImgCount').innerText = uploadedFiles.length;
}
async function convertToPDF() {
    if (uploadedFiles.length === 0) {
        showToast('Please select at least one image');
        return;
    }

    var convertBtn = document.getElementById('convertBtn');
    var downloadPDFContainer = document.getElementById('downloadPDFContainer');
    var previewImageItems = document.getElementById('previewImageItems');
    var resetBtn = document.getElementById('resetBtn');

    convertBtn.disabled = true;
    resetBtn.disabled = true;
    convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Converting...';
    showToast('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Converting images to PDF, please wait...', 'primary');
    previewImageItems.style.opacity = 0.5;

    const progressBar = createProgressBar();
    const pageSize = document.getElementById('pageSize').value;
    const orientation = document.getElementById('orientation').value;
    const pdf = new jsPDF(orientation, 'mm', pageSize);

    try {
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (i > 0) {
                pdf.addPage();
            }
            // const singlePDF = new jsPDF(orientation, 'mm', pageSize);
            const img = await loadImage(uploadedFiles[i]);
            const imgProps = pdf.getImageProperties(img);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
            const width = imgProps.width * ratio;
            const height = imgProps.height * ratio;
            const x = (pdfWidth - width) / 2;
            const y = (pdfHeight - height) / 2;

            pdf.addImage(img, 'JPEG', x, y, width, height);
            updateProgress(progressBar, ((i + 1) / uploadedFiles.length) * 100);

            // singlePDF.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            // const singlePDFBlob = singlePDF.output('blob');
            // const singlePDFUrl = URL.createObjectURL(singlePDFBlob);
            // const singlePDFDownload = document.querySelector(`.pdf_id${(i + 1)}`);
            // singlePDFDownload.href = singlePDFUrl;
            // singlePDFDownload.classList.remove('d-none');
            // singlePDFDownload.setAttribute('download', `image_${i + 1}.pdf`);
        }

        // Generate and download PDF
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadPDF = document.getElementById('downloadPDF');
        
        downloadPDF.href = pdfUrl;
        downloadPDF.classList.remove('d-none');
        downloadPDFContainer.classList.remove('d-none');
        downloadPDF.setAttribute('download', `combined_images_${new Date().getTime()}.pdf`);
        downloadPDF.innerHTML = '<i class="bi bi-file-earmark-pdf-fill"></i> Download PDF';

        downloadPDF.addEventListener('click', () => {
            downloadPDFContainer.classList.add('d-none');
            downloadPDF.classList.add('d-none');
            URL.revokeObjectURL(pdfUrl);
        });
        
        removeProgressBar(progressBar);
        previewImageItems.style.opacity = 1;
        convertBtn.innerHTML = '<i class="bi bi-filetype-pdf"></i> Convert to PDF';
        convertBtn.disabled = false;
        resetBtn.disabled = false;
        showToast('<i class="bi bi-check-circle-fill me-2"></i> Conversion completed successfully', 'success');

    } catch (error) {
        console.error('Conversion error:', error);
        showToast('Error during conversion: ' + error.message);
        convertBtn.innerHTML = '<i class="bi bi-filetype-pdf"></i> Convert to PDF';
        removeProgressBar(progressBar);
        convertBtn.disabled = false;
        previewImageItems.style.opacity = 1;
    }
}

function createProgressBar() {
    const container = document.createElement('div');
    container.className = 'progress mt-3';
    container.innerHTML = `
        <div class="progress-bar" role="progressbar" style="width: 0%" 
             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
    `;
    document.querySelector('#progress').appendChild(container);
    return container;
}

function updateProgress(progressBar, percentage) {
    const bar = progressBar.querySelector('.progress-bar');
    bar.style.width = `${percentage}%`;
    bar.setAttribute('aria-valuenow', percentage);
    bar.innerText = `${percentage.toFixed()}%`;
}

function removeProgressBar(progressBar) {
    setTimeout(() => progressBar.remove(), 1000);
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('imagePreview').innerHTML = '';
    uploadedFiles = [];
    document.getElementById('fileInput').value = '';
    downloadPDFContainer.classList.add('d-none');
});
