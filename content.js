// Log to confirm that content.js is loaded
console.log('content.js loaded');

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  const jobCodes = request.jobCodes;
  const jobScores = [];

  if (!jobCodes || jobCodes.length === 0) {
    // If jobCodes is empty, send an empty response immediately
    sendResponse({ jobScores: [] });
    return true; // Keep the message channel open for async response
  }

  let completedCount = 0; // Track the number of completed queries

  // Process each job code
  jobCodes.forEach((jobCode, index) => {
    setTimeout(() => {
      // Check if the input element exists
      const checkElement = setInterval(() => {
        const zwdmElement = document.getElementById('zwdm');
        if (zwdmElement) {
          // Set the job code and submit the form
          zwdmElement.value = jobCode;
          document.getElementById('btn_submit').click();
          clearInterval(checkElement);

          // Wait for the page to update and extract the score
          setTimeout(() => {
            const scoreElement = document.querySelector('tbody tr:nth-child(2) td:nth-child(4)');
            const score = scoreElement ? scoreElement.textContent : 'N/A';
            jobScores.push(score);

            completedCount++;

            // If all job codes are processed, send the response
            if (completedCount === jobCodes.length) {
              sendResponse({ jobScores: jobScores });
            }
          }, 2000); // Adjust this timeout based on how long the page takes to update
        } else {
          // If the input element is not found, log an error and send an empty response
          console.error(`Element with id 'zwdm' not found`);
          sendResponse({ jobScores: [] });
        }
      }, 500); // Check for the element every 500ms
    }, index * 2000); // Delay each job code processing by 2 seconds
  });

  return true; // Keep the message channel open for async response
});