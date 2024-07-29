document.addEventListener('DOMContentLoaded', () => {
    // Handle file upload
    const uploadButton = document.querySelector('button[type="button"]');
    const fileInput = document.getElementById('fileInput');
    const fileContent = document.getElementById('fileContent');

    if (uploadButton && fileInput) {
        uploadButton.addEventListener('click', () => {
            fileInput.click(); // Trigger the file input click
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0]; // Get the selected file

            if (!file) {
                alert('Please select a file to upload.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(result => {
                fileContent.textContent = result;
            })
            .catch(error => {
                console.error('Error:', error);
                fileContent.textContent = `Error: ${error.message}`;
            });
        });
    } else {
        console.error('Upload button or file input not found.');
    }

    // Handle Delete button clicks
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default behavior for buttons
            const url = event.target.getAttribute('data-url');
            if (confirm('Are you sure you want to delete this file?')) {
                fetch(url, { method: 'DELETE' })
                    .then(response => response.text())
                    .then(result => {
                        if (result === 'File deleted') {
                            event.target.closest('.gallery-item').remove();
                        } else {
                            alert('Failed to delete the file.');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('An error occurred.');
                    });
            }
        });
    });

    // Handle Copy URL button clicks
    document.querySelectorAll('.copy-url-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default behavior for buttons
            const url = event.target.getAttribute('data-url');
            navigator.clipboard.writeText(url)
                .then(() => {
                    alert('URL copied to clipboard!');
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to copy URL.');
                });
        });
    });
});

