document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('processButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
      console.log('File selected:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File read successfully');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert the worksheet content into a JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract jobCodes starting from the third row (index 2)
        const jobCodes = jsonData.slice(2).map(row => row[1]);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({ 
            files: ['content.js'], 
            target: { tabId: tabs[0].id } }, () => {
            chrome.tabs.sendMessage(tabs[0].id, { jobCodes: jobCodes }, (response) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
              } else {
                console.log('Job scores received:', response.jobScores);

                // Determine the last column index based on the third row (index 2)
                const lastColumnIndex = jsonData[2].length; // Use the third row to determine the number of columns

                // Insert scores into the last column starting from the third row
                response.jobScores.forEach((score, index) => {
                  const rowIndex = index + 2; // Start from the third row (index 2)
                  const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: lastColumnIndex });
                  worksheet[cellAddress] = { v: score };
                });

                // Update the workbook and save the file
                const newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
                XLSX.writeFile(newWorkbook, 'JobScores.xlsx');
                console.log('Job scores saved to JobScores.xlsx');
              }
            });
          });
          return true; // Keep the message channel open for sendResponse
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error('No file selected');
    }
  });
});