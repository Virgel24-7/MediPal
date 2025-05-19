const AIO_USERNAME = import.meta.env.VITE_AIO_USERNAME;
const AIO_KEY = import.meta.env.VITE_AIO_KEY;

const SESSION_ID_FEED_KEY = "sessionid"; 
const NUM_OF_DOSE_FEED_KEY = "numofdose"; 
const ALARM_FEED_KEY = "alarmflag";
const SET_DOSE_TIME_FEED_KEY = "setdosetime";
const TAKE_DOSE_TIME_FEED_KEY = "takedosetime";

const SESSION_DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${SESSION_ID_FEED_KEY}/data`;
const NUM_OF_DOSE_DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${NUM_OF_DOSE_FEED_KEY}/data`;
const ALARM_DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${ALARM_FEED_KEY}/data`;
const SET_DOSE_TIME_DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${SET_DOSE_TIME_FEED_KEY}/data`;
const TAKE_DOSE_TIME_DATA_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${TAKE_DOSE_TIME_FEED_KEY}/data`;

const alarmButton = document.getElementById("alarmButton");

let lastIotAllowTime = null; 
let cooldownTimeoutId = null;
let currentSessionId = 0;

function fetchData() {
  updateDisplay();
  fetchAlarm();
}

//Fetch Code
async function fetchSessionId() {
    const response = await fetch(SESSION_DATA_URL + "?limit=1", {
        headers: {
            "X-AIO-Key": AIO_KEY,
        },
    });
    const data = await response.json();
    return data[0].value;
}

async function fetchNumOfDose() {
    const response = await fetch(NUM_OF_DOSE_DATA_URL + "?limit=1", {
        headers: {
            "X-AIO-Key": AIO_KEY,
        },
    });
    const data = await response.json();
    return data[0].value.split(" ");
}

async function fetchAlarm() {
  try {
    const response = await fetch(ALARM_DATA_URL + "?limit=1", {
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

async function fetchSetDoseTime() {
    try {
        const response = await fetch(SET_DOSE_TIME_DATA_URL + "?limit=3", {
            headers: {
                "X-AIO-Key": AIO_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch set dose time: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const values = data.map((dataobj) => dataobj.value);
        return values; // Return the value of the latest take dose time
    } catch (error) {
        console.error("Error fetching set dose time:", error);
    }
}

async function fetchTakeDoseTime() {
    try {
        const response = await fetch(TAKE_DOSE_TIME_DATA_URL + "?limit=3", {
            headers: {
                "X-AIO-Key": AIO_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch take dose time: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const values = data.map((dataobj) => dataobj.value);
        return values; // Return the value of the latest take dose time
    } catch (error) {
        console.error("Error fetching take dose time:", error);
    }
}

async function updateDisplay() {
    const newSessionId = await fetchSessionId();
    
    if (newSessionId !== currentSessionId) {
        currentSessionId = newSessionId;
        // Clear the table
        const tableRows = document.querySelectorAll("tbody tr");
        tableRows.forEach((row, index) => {
          row.querySelector(`[data-dose-index="${index + 1}"]`).textContent = "----"; // Indicate no dose
          row.querySelector(`[data-time-to-take="${index + 1}"]`).textContent = "----"; // Indicate no dose
          row.querySelector(`[data-status="${index + 1}"]`).textContent = "----"; // Indicate no dose
          row.querySelector(`[data-time-taken="${index + 1}"]`).textContent = "----"; // Indicate no dose
         });
    } else {
        const [NumDoseSessionId, doseCount] = await fetchNumOfDose();
        if (NumDoseSessionId === currentSessionId) {
          
          const takeDoseArrayStr = await fetchTakeDoseTime();
          const setDoseArrayStr = await fetchSetDoseTime();
          const keys = ["sessionid", "doseCount", "time"];
          const takeDoseArrayObj = takeDoseArrayStr.map((takeDose1) => {
            const values = takeDose1.split(" ");
            return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
          });
          const setDoseArrayObj = setDoseArrayStr.map((setDose1) => {
            const values = setDose1.split(" ");
            return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
          });

          const SetDoseTime = ["----","----","----"];
          const TakeDoseTime = ["----","----","----"];
          const Status = ["----", "----", "----"];

          for(let i = 0; i < doseCount; i++) {
            Status[i] = "Not Taken";
          }

          const sdfiltered = setDoseArrayObj.filter((sda) => sda.sessionid == currentSessionId);
          const tdfiltered = takeDoseArrayObj.filter((tda) => tda.sessionid == currentSessionId);

          if(sdfiltered.length > 0) {
            const sdsorted = sdfiltered.sort((a, b) => parseInt(a.doseCount) - parseInt(b.doseCount));

            for(let  i = 0; i < sdsorted.length; i++) {
              SetDoseTime[i] = sdsorted[i].time;
            }
          }

          if(tdfiltered.length > 0) {
          const tdsorted = tdfiltered.sort((a, b) => parseInt(a.doseCount) - parseInt(b.doseCount));

            for(let  i = 0; i < tdsorted.length; i++) {
              TakeDoseTime[i] = tdsorted[i].time;
              Status[i] = "Taken";
            }
          }

          updateTable(doseCount, SetDoseTime, TakeDoseTime, Status);
        } else {
            // Clear the table if session ID does not match
            const tableRows = document.querySelectorAll("tbody tr");
            tableRows.forEach((row, index) => {
              row.querySelector(`[data-dose-index="${index + 1}"]`).textContent = "----"; // Indicate no dose
              row.querySelector(`[data-time-to-take="${index + 1}"]`).textContent = "----"; // Indicate no dose
              row.querySelector(`[data-status="${index + 1}"]`).textContent = "----"; // Indicate no dose
              row.querySelector(`[data-time-taken="${index + 1}"]`).textContent = "----"; // Indicate no dose
            });
        }
    }
}

async function updateTable(doseCount ,SetDoseTime, TakeDoseTime, Status) {
    const tableRows = document.querySelectorAll("tbody tr");
    tableRows.forEach((row, index) => {
        if (index < doseCount) {
            row.querySelector(`[data-dose-index="${index + 1}"]`).textContent = index + 1; // Update Dose Index
            row.querySelector(`[data-time-to-take="${index + 1}"]`).textContent = SetDoseTime[index]; // Clear Time To Take
            row.querySelector(`[data-status="${index + 1}"]`).textContent = Status[index]; // Clear Status
            row.querySelector(`[data-time-taken="${index + 1}"]`).textContent = TakeDoseTime[index]; // Clear Time Taken
        } else {
            row.querySelector(`[data-dose-index="${index + 1}"]`).textContent = "----"; // Indicate no dose
            row.querySelector(`[data-time-to-take="${index + 1}"]`).textContent = "----"; // Indicate no dose
            row.querySelector(`[data-status="${index + 1}"]`).textContent = "----"; // Indicate no dose
            row.querySelector(`[data-time-taken="${index + 1}"]`).textContent = "----"; // Indicate no dose
        }
    });
}

function parseDateTime(dateTimeString) {
  return new Date(dateTimeString);
}

function handleApiData(data) {
  if (!data.length) {
    enableButton();
    return;
  }

  const latestCommand = data[0];
  if (latestCommand.value === "PIC allow") {
    const lastPICAllowTime = parseDateTime(latestCommand.created_at);
    const now = new Date();
    const diffSeconds = (now - (lastPICAllowTime)) / 1000;
    if (diffSeconds >= 10) {
      enableButton();
    }
    return;
  } else if (latestCommand.value === "PIC deny") {
    disableButton();
    return;
  }

  const latestIotAllow = data.find((entry) => entry.value === "IOT allow");
  if (latestIotAllow) {
    lastIotAllowTime = parseDateTime(latestIotAllow.created_at);
    const now = new Date();
    const diffSeconds = (now - (lastIotAllowTime)) / 1000;
    if (diffSeconds <= 20) {
      disableButtonWithTime(22 - diffSeconds);
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

async function sendCommand(value) {
  try {
    const response = await fetch(ALARM_DATA_URL, {
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

alarmButton.addEventListener("click", async () => {
  if (alarmButton.disabled) return;
  const success = await sendCommand("IOT allow");
  if (success) {
    lastIotAllowTime = new Date();
    disableButtonForDuration(20);
  }
});

setInterval(fetchData, 500);

