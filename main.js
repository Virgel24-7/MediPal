//API LINK CONFIGURATION
const AIO_USERNAME = import.meta.env.VITE_AIO_USERNAME;
const AIO_KEY = import.meta.env.VITE_AIO_KEY;

const FEED_KEY = "alarmflag"; //Feed key

const DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${FEED_KEY}/data`;
const alarmButton = document.getElementById("alarmButton");

let lastIotAllowTime = null; //variable to store the timestamp of the last "IOT allow" command received
let cooldownTimeoutId = null; //

// Fetch latest feed data entries
async function fetchData() {
  try {
    const response = await fetch(DATA_URL + "?limit=1", {
      headers: {
        "X-AIO-Key": AIO_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    handleApiData(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// Converts Adafruit time string to Date object (ISO 8601 - UTC)
function parseDateTime(dateTimeString) {
  return new Date(dateTimeString);
}

// Handle received data to adjust button state
function handleApiData(data) {
  // Data is an array with latest first
  if (!data.length) {
    // No data: enable button by default
    enableButton();
    return;
  }

  // Otherwise check the very latest command
  const latestCommand = data[0];
  if (latestCommand.value === "PIC allow") {
    enableButton();
    return;
  } else if (latestCommand.value === "PIC deny") {
    disableButton();
    return;
  }

  // Find the latest 'IOT allow' command to handle 15s disable window
  const latestIotAllow = data.find((entry) => entry.value === "IOT allow");
  if (latestIotAllow) {
    lastIotAllowTime = parseDateTime(latestIotAllow.created_at);
    const now = new Date();
    const diffSeconds = (now - lastIotAllowTime) / 1000;
    if (diffSeconds < 15) {
      // Within cooldown, disable button for remaining time
      disableButtonWithTime(15 - diffSeconds);
      return;
    } else {
      enableButton();
      return;
    }
  } else {
    enableButton();
    return;
  }
}

function enableButton() {
  clearCooldown();
  alarmButton.disabled = false;
  alarmButton.textContent = "Enable";
  alarmButton.classList.add("alarm-on");
}

function disableButton() {
  clearCooldown();
  alarmButton.disabled = true;
  alarmButton.textContent = "Disabled";
  alarmButton.classList.remove("alarm-on");
}

function clearCooldown() {
  if (cooldownTimeoutId !== null) {
    clearTimeout(cooldownTimeoutId);
    cooldownTimeoutId = null;
  }
}

function disableButtonWithTime(seconds) {
  alarmButton.disabled = true;
  alarmButton.textContent = `Disabled (${Math.floor(seconds)}s)`;
  alarmButton.classList.remove("alarm-on");
}

// Send POST command to Adafruit feed
async function sendCommand(value) {
  try {
    const response = await fetch(DATA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AIO-Key": AIO_KEY,
      },
      body: JSON.stringify({ value: value }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send command: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Command sent:", result);
    return true;
  } catch (error) {
    console.error("Error sending command:", error);
    return false;
  }
}

// Button click handler
alarmButton.addEventListener("click", async () => {
  if (alarmButton.disabled) return;

  // Send "IOT allow" command and disable button for 15 sec cooldown
  const success = await sendCommand("IOT allow");
  if (success) {
    lastIotAllowTime = new Date();
    disableButtonForDuration(15);
  }
});

// Initial data fetch and ongoing polling every 5 seconds
console.log(AIO_USERNAME);
console.log(AIO_KEY);
fetchData();
setInterval(fetchData, 1000);
