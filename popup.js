document.addEventListener('DOMContentLoaded', () => {
  // Add a click event listener to the process button
  document.getElementById('processButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
      console.log('File selected:', file.name);

      // Read the Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File read successfully');

        // Parse the Excel file
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert the worksheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract job codes starting from the third row (index 2)
        const jobCodes = jsonData.slice(2).map(row => row[1]);

        // Query the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            const tabId = tabs[0].id;

            // Update UI to show processing status
            document.getElementById('status').textContent = 'Processing...';
            document.getElementById('processButton').disabled = true;

            // Send the job codes to content.js with the new format
            chrome.tabs.sendMessage(tabId, { 
              action: 'startProcessing',
              jobCodes: jobCodes 
            }, (response) => {
              // if (chrome.runtime.lastError) {
              //   // Handle errors in communication
              //   console.error('Error receiving response:', chrome.runtime.lastError.message);
              //   // document.getElementById('status').textContent = 'Error processing job codes';
              //   document.getElementById('processButton').disabled = true;
              // }
            });

            // Listen for processing complete message
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
              if (message.action === 'processingComplete') {
                console.log('Job scores received:', message.jobScores);
                document.getElementById('status').textContent = 'Processing complete';
                document.getElementById('processButton').disabled = false;

                // Add header for scores column if it doesn't exist
                const headerRow = 1; // Assuming headers are in second row 
                const lastColumnIndex = jsonData[2].length;
                const scoreHeaderCell = XLSX.utils.encode_cell({ r: headerRow, c: lastColumnIndex });
                if (!worksheet[scoreHeaderCell]) {
                  worksheet[scoreHeaderCell] = { v: 'Score' };
                }

                // Insert scores into the last column of the worksheet
                try {
                  message.jobScores.forEach((score, index) => {
                    const rowIndex = index + 2; // Start from the third row (index 2)
                    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: lastColumnIndex });
                    worksheet[cellAddress] = { v: score, t: 'n' }; // 'n' for number type
                  });

                  // Save the updated workbook to a new file
                  const newWorkbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
                  XLSX.writeFile(newWorkbook, 'JobScores.xlsx');
                } catch (error) {
                  console.error('Error writing scores to Excel:', error);
                  document.getElementById('status').textContent = 'Error saving scores';
                }
                console.log('Job scores saved to JobScores.xlsx');
              }
            });
          } else {
            console.error('No active tab found');
          }
        });
      };

      // Read the file as an array buffer
      reader.readAsArrayBuffer(file);
    } else {
      console.error('No file selected');
    }
  });
});
