console.log('content.js loaded');

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  if (request.action === 'startProcessing') {
    const jobCodes = request.jobCodes;
    const jobScores = [];

    if (!jobCodes || jobCodes.length === 0) {
      sendResponse({ jobScores: [] });
      return true;
    }

    // Save the jobCodes and jobScores in chrome.storage
    chrome.storage.local.set({ 
      jobCodes, 
      jobScores,
      processing: true,
      currentIndex: 0,
      sendResponseCallback: true
    }, () => {
      processNextJobCode();
    });

    return true; // Keep the message channel open for async response
  }
});

// Function to process the next job code
function processNextJobCode() {
  chrome.storage.local.get(['jobCodes', 'jobScores', 'currentIndex'], (result) => {
    const { jobCodes, jobScores, currentIndex } = result;
    
    if (currentIndex >= jobCodes.length) {
      // Processing complete
      chrome.storage.local.set({ processing: false }, () => {
        sendFinalResponse(jobScores);
      });
      return;
    }

    const jobCode = jobCodes[currentIndex];
    
    const checkElement = setInterval(() => {
      const zwdmElement = document.getElementById('zwdm');
      if (zwdmElement) {
        zwdmElement.value = jobCode;
        document.getElementById('btn_submit').click();
        clearInterval(checkElement);

        // Prepare for page reload
        chrome.storage.local.set({ 
          currentIndex: currentIndex + 1,
          waitingForReload: true
        });
      }
    }, 500);
  });
}

// Function to handle page reload
function handlePageReload() {
  chrome.storage.local.get(['jobCodes', 'jobScores', 'currentIndex', 'waitingForReload', 'shouldStop'], (result) => {
    if (result.shouldStop) {
      // Clean up and stop processing
      chrome.storage.local.remove([
        'jobCodes',
        'jobScores',
        'currentIndex',
        'processing',
        'sendResponseCallback',
        'waitingForReload',
        'shouldStop'
      ]);
      return;
    }

    if (result.waitingForReload) {
      // Use MutationObserver to wait for score element
      const observer = new MutationObserver((mutations, obs) => {
        const scoreElement = document.querySelector('tbody tr:nth-child(2) td:nth-child(4)');
        if (scoreElement) {
          obs.disconnect();
          
          // Extract the score
          const score = scoreElement.textContent.trim().replace(/[^\d.-]/g, '');
          
          // Update jobScores
          const updatedScores = [...(result.jobScores || []), score];
          
          chrome.storage.local.set({
            jobScores: updatedScores,
            waitingForReload: false
          }, () => {
            // Process next job code
            processNextJobCode();
          });
        }
      });

      // Start observing the document body
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Set timeout as fallback
      setTimeout(() => {
        observer.disconnect();
        const scoreElement = document.querySelector('tbody tr:nth-child(2) td:nth-child(4)');
        const score = scoreElement ? scoreElement.textContent.trim().replace(/[^\d.-]/g, '') : 'N/A';
        
        chrome.storage.local.set({
          jobScores: [...(result.jobScores || []), score],
          waitingForReload: false
        }, () => {
          processNextJobCode();
        });
      }, 10000); // 10 second timeout
    }
  });
}

// Function to send final response
function sendFinalResponse(jobScores) {
  chrome.storage.local.get(['sendResponseCallback'], (result) => {
    if (result.sendResponseCallback) {
      chrome.runtime.sendMessage({
        action: 'processingComplete',
        jobScores: jobScores
      });
      
      // Clear storage
      chrome.storage.local.remove([
        'jobCodes',
        'jobScores',
        'currentIndex',
        'processing',
        'sendResponseCallback'
      ]);
    }
  });
}

// Check for pending tasks on page load
window.addEventListener('load', () => {
  chrome.storage.local.get(['processing'], (result) => {
    if (result.processing) {
      handlePageReload();
    }
  });
});
