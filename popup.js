// Function to split job codes into batches
function splitJobCodesIntoBatches(jobCodes, batchSize) {
  const batches = [];
  for (let i = 0; i < jobCodes.length; i += batchSize) {
      batches.push(jobCodes.slice(i, i + batchSize));
  }
  return batches;
}

// Function to process job codes in batches
function processJobCodesInBatches(worksheet, batchSize, callback) {
  // Convert the worksheet to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const lastColumnIndex = jsonData[2].length;
  // Extract job codes starting from the third row (index 2)
  const jobCodes = jsonData.slice(2).map(row => row[1]);
  const batches = splitJobCodesIntoBatches(jobCodes, batchSize);
  let results = [];
  let currentBatch = 0;
  function processNextBatch() {
      if (batches.length === 0) {
          callback(results);
          return;
      }
      ++currentBatch;
      const batch = batches.shift();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tabId = tabs[0].id;

          // Update UI to show processing status
          document.getElementById('status').textContent = `Processing batch ${currentBatch}...`;
          document.getElementById('processButton').disabled = true;

          chrome.tabs.sendMessage(tabId, { 
              action: 'startProcessing',
              jobCodes: batch 
          }, (response) => {
          });
          

          // Listen for processing complete message
          chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'processingComplete') {
              console.log('Batch:', currentBatch);
              console.log('Job scores received:', message.jobScores);
              results = results.concat(message.jobScores);
              setTimeout(processNextBatch, Math.random() * 5000 + 1000); // Random wait between 1 and 5 seconds
              wirteExcelFile();
            }
          });
        } else {
          console.error('No active tab found');
        }
      });
      
  }

  function wirteExcelFile() {
    // Add header for scores column if it doesn't exist
    const headerRow = 1; // Assuming headers are in second row 
    const scoreHeaderCell = XLSX.utils.encode_cell({ r: headerRow, c: lastColumnIndex });
    if (!worksheet[scoreHeaderCell]) {
      worksheet[scoreHeaderCell] = { v: 'Score' };
    }

    // Insert scores into the last column of the worksheet
    try {
      message.jobScores.forEach((score, index) => {
        const rowIndex = (currentBatch - 1) * batchSize + index + 2; // Start from the third row (index 2)
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: lastColumnIndex });
        worksheet[cellAddress] = { v: score, t: 'n' }; // 'n' for number type
      });

      // Save the updated workbook to a new file
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
      XLSX.writeFile(newWorkbook, `JobScores_${currentBatch}.xlsx`);
      console.log('Job scores saved to JobScores.xlsx');
    } catch (error) {
      console.error('Error writing scores to Excel:', error);
      document.getElementById('status').textContent = 'Error saving scores';
    }
  }
  processNextBatch();
}

document.addEventListener('DOMContentLoaded', () => {
  // Add click event listener for quit button
  document.getElementById('quitButton').addEventListener('click', () => {
    chrome.storage.local.set({ shouldStop: true }, () => {
      document.getElementById('status').textContent = 'Processing stopped';
      document.getElementById('processButton').disabled = false;
      document.getElementById('quitButton').disabled = true;
    });
  });

  // Add a click event listener to the process button
  document.getElementById('processButton').addEventListener('click', () => {
    // Enable quit button and disable process button
    document.getElementById('quitButton').disabled = false;
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

        
        const batchSize = 100;
        processJobCodesInBatches(worksheet, batchSize, (allResults) => {
          document.getElementById('status').textContent = 'Processing complete';
          document.getElementById('processButton').disabled = false;
          console.log('All results:', allResults);
        });
      };
      // Read the file as an array buffer
      reader.readAsArrayBuffer(file);
    } else {
      console.error('No file selected');
    }
  });
});
