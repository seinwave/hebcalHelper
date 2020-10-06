const nlp = require("compromise");
nlp.extend(require("compromise-numbers"));
const axios = require("axios");

// need this function to fix a very strange DF edge-case,
// where asking for a future date, in weeks,  using
// number spelling, (eg - "in three weeks") returns the
// present date for a parameter
function addTime(query, date) {
  let realDate = new Date(date);
  let doc = nlp(query);
  let number = doc.numbers().json();
  let weeks = number[0].number;
  let days = weeks * 7;
  let result = new Date(realDate.setDate(realDate.getDate() + days));
  return result;
}

function dateConverter(query, params) {
  let receivedRawDate;
  if (typeof params["date-time"] === "string") {
    // maybe the weirdest DF edge case
    // asking about the year 1955 is treated like
    // asking about TODAY, at 7:55pm
    console.log("DATE-TIME PARAMETERS:", params);
    if (params["date-time"].includes("19:55")) {
      receivedRawDate = "1955-01-01T00:00:00-04:00";
    } else {
      receivedRawDate = params["date-time"];
    }
  } else if (params["date-period"]) {
    receivedRawDate = params["date-period"]["startDate"];
  } else if (Object.keys(params["date-time"]).includes("endDateTime")) {
    if (
      // fixing an edge case where dialogflow returns
      // a result from the present year, but several weeks
      // in the past
      new Date(params["date-time"]["endDateTime"]) < Date.now() &&
      query.includes("weeks")
    ) {
      receivedRawDate = addTime(query, params["date-time"]["endDateTime"]);
    } else {
      receivedRawDate = params["date-time"]["endDateTime"];
    }
  } else if (Object.keys(params["date-time"]).includes("startDate")) {
    receivedRawDate = params["date-time"]["startDate"];
  } else {
    receivedRawDate = params["date-time"]["date_time"];
  }

  console.log(receivedRawDate);

  // fixing edge cases where DF returns a startDate
  // with an end time of "03:58:29"
  // (...for some reason),
  // which Date.parse() cannot work with
  // (...for some reason).
  if (receivedRawDate.includes('03:58:29')){
    const regex = /03:58:29/gi;
    receivedRawDate = receivedRawDate.replace(regex, '04:00');
  }
  
  const gregRaw = new Date(Date.parse(receivedRawDate));
  console.log("RAWGREG:", gregRaw);

  const gregReady = {};
  gregReady.year = gregRaw.getFullYear();
  gregReady.month = gregRaw.getMonth() + 1;
  gregReady.day = gregRaw.getDate();

  return gregReady;
}

function getHebrewDate(url) {
  return axios.get(url);
}

function requestingPermission(conv, permissionGranted) {
  if (!permissionGranted) {
    throw new Error("Permission not granted");
  } else {
    conv.user.storage.location = conv.device.location;
    return conv.ask(
      "Thanks! Now I can tell you exactly when to light the candles. Go ahead and ask me again, please!"
    );
  }
}

module.exports = {
  addTime,
  dateConverter,
  getHebrewDate,
  requestingPermission,
};
