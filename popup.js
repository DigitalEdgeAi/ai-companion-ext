// In popup.js (this script will be linked from popup.html)

document.addEventListener('DOMContentLoaded', () => {
  const tabList = document.getElementById('tabList'); // Assuming you have a <ul> in popup.html
  const analyzeButton = document.getElementById('analyzeButton'); // Assuming a button

  // Get currently open tabs in the active window
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    tabList.innerHTML = ''; // Clear previous list
    tabs.forEach(tab => {
      // Don't list unusable tabs (e.g., chrome:// pages)
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
         const listItem = document.createElement('li');
         listItem.innerHTML = `
             <input type="checkbox" id="tab-${tab.id}" value="${tab.id}">
             <label for="tab-${tab.id}">${tab.title}</label>
         `;
         tabList.appendChild(listItem);
      }
    });
  });

  analyzeButton.addEventListener('click', () => {
    const selectedTabIds = [];
    const checkboxes = tabList.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      selectedTabIds.push(parseInt(cb.value, 10)); // Get the tab ID
    });

    if (selectedTabIds.length > 0) {
      // Send selected tab IDs to the background script
      chrome.runtime.sendMessage(
        { action: "processTabs", tabIds: selectedTabIds },
        (response) => {
           // Handle the response from the background script (the AI result)
           console.log("Received response from background:", response);
           // Update the popup UI with the result here...
           document.getElementById('results').textContent = response?.summary || "Error processing.";
        }
      );
    } else {
      document.getElementById('results').textContent = "Please select at least one tab.";
    }
  });
});

// --- Need popup.html with elements like: ---
// <ul id="tabList"></ul>
// <button id="analyzeButton">Analyze Selected Tabs</button>
// <div id="results"></div>
Use code with caution.
JavaScript
b) Handling the Request in the Background (background.js):
// In background.js (Service Worker)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processTabs") {
    const tabIds = request.tabIds;
    console.log("Background received request to process tabs:", tabIds);

    getTextContentFromTabs(tabIds)
      .then(tabContents => {
        console.log("Extracted content:", tabContents);
        // **NEXT STEP:** Combine content and send to AI
        // For now, just combine and return a placeholder summary

        const combinedText = tabContents
            .map(item => `Tab ${item.tabId}:\n${item.content || 'Could not get content.'}`)
            .join('\n\n---\n\n');

        // Placeholder for AI call
        const placeholderSummary = `Processed ${tabContents.length} tabs. Combined text length: ${combinedText.length}.`;

        // Send the result back to the popup
        sendResponse({ success: true, summary: placeholderSummary });

        // ---- TODO: Replace placeholder with actual AI call ---
        // callAI(combinedText, userPrompt)
        //    .then(aiResponse => sendResponse({ success: true, summary: aiResponse }))
        //    .catch(error => sendResponse({ success: false, error: error.message }));
        // return true; // Indicate asynchronous response if making real API call
        // ---- End TODO ----

      })
      .catch(error => {
        console.error("Error getting tab content:", error);
        sendResponse({ success: false, error: error.message });
      });

    // **Important:** If you make an asynchronous call (like fetch or another async function)
    // inside the listener, you MUST return `true` here to keep the message channel
    // open for `sendResponse` to work later. Since we are currently returning synchronously,
    // it's not strictly needed, but good practice if you plan async calls.
    // return true; // Uncomment if making async calls like fetch to an AI API
  }
  return false; // Return false if not handling the message asynchronously
});


// Function to get text content from multiple tabs
async function getTextContentFromTabs(tabIds) {
  const results = [];
  for (const tabId of tabIds) {
    try {
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => document.body.innerText // The function injected into the tab
      });

      // executeScript returns an array of results, one for each frame.
      // We usually want the result from the main frame (index 0).
      if (injectionResults && injectionResults[0] && injectionResults[0].result) {
        results.push({ tabId: tabId, content: injectionResults[0].result });
      } else {
         // Handle cases where injection failed or body.innerText is empty/null
         results.push({ tabId: tabId, content: null, error: "Could not extract text."});
         console.warn(`Could not get text content from tab ${tabId}. Injection result:`, injectionResults);
      }
    } catch (error) {
      console.error(`Error injecting script into tab ${tabId}:`, error);
      results.push({ tabId: tabId, content: null, error: error.message });
    }
  }
  return results;
}

// --- TODO: Function to call AI API ---
// async function callAI(text, prompt) { ... }
