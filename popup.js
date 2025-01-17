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

            // Send the job codes to content.js
            chrome.tabs.sendMessage(tabId, { jobCodes: jobCodes }, (response) => {
              if (chrome.runtime.lastError) {
                // Handle errors in communication
                console.error('Error receiving response:', chrome.runtime.lastError.message);
              } else {
                console.log('Job scores received:', response.jobScores);

                // Insert scores into the last column of the worksheet
                const lastColumnIndex = jsonData[2].length; // Use the third row to determine the number of columns
                response.jobScores.forEach((score, index) => {
                  const rowIndex = index + 2; // Start from the third row (index 2)
                  const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: lastColumnIndex });
                  worksheet[cellAddress] = { v: score };
                });

                // Save the updated workbook to a new file
                const newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
                XLSX.writeFile(newWorkbook, 'JobScores.xlsx');
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