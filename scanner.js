window.addEventListener('load', function () {
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const videoElement = document.getElementById('video');
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const resultElement = document.getElementById('result');
    let selectedDeviceId;

    console.log('ZXing code reader initialized');

    // You can listen for 'canplay' event to know when the video is ready
    videoElement.addEventListener('canplay', (event) => {
        console.log('Video is ready to play');
    });

    // Start scanning when the button is clicked
    startButton.addEventListener('click', () => {
        // We need to ask for camera permissions first
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function (stream) {
                videoElement.srcObject = stream;
                videoElement.play(); // Start the video feed

                // Hide start button and show reset button
                startButton.style.display = 'none';
                resetButton.style.display = 'inline-block';

                // Start decoding from the video stream
                codeReader.decodeFromVideoDevice(undefined, 'video', (result, err) => {
                    if (result) {
                        console.log(result);
                        resultElement.textContent = result.text;
                        
                        // Optional: Play a sound effect
                        const beep = new Audio('beep.mp3'); // Make sure you have a beep.mp3 file
                        beep.play();
                        
                        // Stop the scanner once a barcode is found
                        codeReader.reset();
                        stream.getTracks().forEach(track => track.stop()); // Stop the camera
                        videoElement.srcObject = null;
                        
                        resetButton.textContent = 'Scan Again';
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error(err);
                        resultElement.textContent = `Error: ${err}`;
                    }
                });

                console.log(`Started continuous decode from camera`);
            })
            .catch(function (err) {
                console.error('Error getting user media:', err);
                alert('Could not initialize camera. Please grant permission and use HTTPS.');
            });
    });

    // Reset the scanner
    resetButton.addEventListener('click', () => {
        codeReader.reset();
        resultElement.textContent = 'Waiting for scan...';
        videoElement.srcObject = null;
        
        // Hide reset button and show start button
        startButton.style.display = 'inline-block';
        resetButton.style.display = 'none';
        resetButton.textContent = 'Reset';
    });
});