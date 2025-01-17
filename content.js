console.log('content.js loaded');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  const jobCodes = request.jobCodes;
  const jobScores = [];
  
  if (!jobCodes || jobCodes.length === 0) {
    sendResponse({ jobScores: [] }); 
    return true; // Keep the message channel open for sendResponse
  }
  jobCodes.forEach((jobCode, index) => {
    setTimeout(() => {
      const checkElement = setInterval(() => {
        const zwdmElement = document.getElementById('zwdm');
        if (zwdmElement) {
          zwdmElement.value = jobCode;
          document.getElementById('btn_submit').click();
          clearInterval(checkElement);
        } else {
          console.error(`Element with id 'zwdm' not found`);
        }
      }, 500);

      setTimeout(() => {
        const scoreElement = document.querySelector('tbody tr:nth-child(2) td:nth-child(4)');
        const score = scoreElement ? scoreElement.textContent : 'N/A';
        jobScores.push(score);

        if (index === jobCodes.length - 1) {
          sendResponse({ jobScores: jobScores });
        }
      }, 2000);
    }, index * 2000);
  });

  return true; // Keep the message channel open for sendResponse
});