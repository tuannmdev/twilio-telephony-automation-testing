class CallDashboard {
  constructor() {
    this.baseUrl = "http://localhost:3000";
    this.currentCallSid = null;
    this.pollingInterval = null;
    this.callHistory = [];

    this.phoneInput = document.getElementById("phone-input");
    this.makeCallBtn = document.getElementById("make-call-btn");
    this.statusDisplay = document.getElementById("status-display");
    this.statusMessage = document.getElementById("status-message");
    this.callSidDisplay = document.getElementById("call-sid");
    this.historyBody = document.getElementById("history-body");

    this.init();
  }

  init() {
    this.makeCallBtn.addEventListener("click", () => this.handleMakeCall());
    this.loadCallHistory();
  }

  async handleMakeCall() {
    const phoneNumber = this.phoneInput.value.trim();

    if (!phoneNumber) {
      alert("Please enter a phone number");
      return;
    }

    if (!phoneNumber.match(/^\+\d{10,15}$/)) {
      alert("Please enter a valid phone number in E.164 format (e.g., +15005550006)");
      return;
    }

    this.makeCallBtn.disabled = true;
    this.makeCallBtn.textContent = "Calling...";

    try {
      await this.makeCall(phoneNumber);
    } catch (error) {
      console.error("Error making call:", error);
      this.updateStatusDisplay("failed", `Error: ${error.message}`, null);
      this.makeCallBtn.disabled = false;
      this.makeCallBtn.textContent = "Make Call";
    }
  }

  async makeCall(phoneNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/api/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: phoneNumber,
          twimlUrl: `${this.baseUrl}/webhook/voice`
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentCallSid = data.call.sid;
        this.updateStatusDisplay(
          data.call.status,
          `Call initiated to ${phoneNumber}`,
          data.call.sid
        );

        // Start polling for status updates
        this.startPolling();
      } else {
        throw new Error(data.error || "Failed to make call");
      }
    } catch (error) {
      throw error;
    }
  }

  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.pollCallStatus();
    }, 2000);
  }

  async pollCallStatus() {
    if (!this.currentCallSid) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/call/${this.currentCallSid}`);
      const data = await response.json();

      if (data.success) {
        const call = data.call;
        this.updateStatusDisplay(
          call.status,
          `Call ${call.status}`,
          call.sid
        );

        // Stop polling if call is in terminal state
        if (["completed", "failed", "busy", "no-answer", "canceled"].includes(call.status)) {
          this.stopPolling();
          this.makeCallBtn.disabled = false;
          this.makeCallBtn.textContent = "Make Call";

          // Add to history
          this.addToHistory(call);
        }
      }
    } catch (error) {
      console.error("Error polling call status:", error);
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  updateStatusDisplay(status, message, callSid) {
    const statusIndicator = this.statusDisplay.querySelector(".status-indicator");
    const statusText = statusIndicator.querySelector(".status-text");

    // Remove all status classes
    statusIndicator.classList.remove("idle", "queued", "ringing", "in-progress", "completed", "failed", "busy");

    // Add current status class
    statusIndicator.classList.add(status);

    // Update text
    statusText.textContent = this.capitalizeStatus(status);
    this.statusMessage.textContent = message;

    if (callSid) {
      this.callSidDisplay.textContent = `Call SID: ${callSid}`;
    } else {
      this.callSidDisplay.textContent = "";
    }
  }

  capitalizeStatus(status) {
    return status
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  addToHistory(call) {
    this.callHistory.unshift({
      sid: call.sid,
      to: call.to,
      status: call.status,
      duration: call.duration || "0",
      time: new Date().toLocaleString()
    });

    this.renderHistory();
  }

  renderHistory() {
    if (this.callHistory.length === 0) {
      this.historyBody.innerHTML = `
        <tr class="empty-state">
          <td colspan="5">No calls yet</td>
        </tr>
      `;
      return;
    }

    this.historyBody.innerHTML = this.callHistory
      .slice(0, 10)
      .map(call => `
        <tr>
          <td class="call-sid-cell p-3">
            <span class="call-sid-text">${call.sid}</span>
            <div class="call-sid-tooltip">
              <span>${call.sid}</span>
              <button class="copy-btn" data-sid="${call.sid}" onclick="window.copyCallSid(this, '${call.sid}')">
                <span class="material-symbols-outlined">content_copy</span>
                Copy
              </button>
            </div>
          </td>
          <td class="p-3 text-slate-600 text-xs">${call.to}</td>
          <td class="p-3"><span class="status-badge ${call.status}">${this.capitalizeStatus(call.status)}</span></td>
          <td class="p-3 text-slate-600 text-xs">${call.duration}s</td>
          <td class="p-3 text-slate-600 text-xs text-right">${call.time}</td>
        </tr>
      `)
      .join("");
  }

  async loadCallHistory() {
    try {
      const response = await fetch(`${this.baseUrl}/api/calls?limit=10`);
      const data = await response.json();

      if (data.success && data.calls.length > 0) {
        this.callHistory = data.calls.map(call => ({
          sid: call.sid,
          to: call.to,
          status: call.status,
          duration: call.duration || "0",
          time: new Date(call.dateCreated).toLocaleString()
        }));

        this.renderHistory();
      }
    } catch (error) {
      console.error("Error loading call history:", error);
    }
  }
}

// Global function to copy Call SID to clipboard
window.copyCallSid = async function(button, sid) {
  try {
    await navigator.clipboard.writeText(sid);
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="material-symbols-outlined">check</span>Copied!';
    button.classList.add("copied");
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove("copied");
    }, 1500);
  } catch (error) {
    console.error("Failed to copy:", error);
  }
};

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new CallDashboard();
});
