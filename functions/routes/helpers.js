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
  if (params["date-period"]) {
    receivedRawDate = params["date-period"]["startDate"];
  } else if (typeof params["date-time"] === "string") {
    receivedRawDate = params["date-time"];
  } else if (Object.keys(params["date-time"]).includes("endDateTime")) {
    if (
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

  const gregRaw = new Date(Date.parse(receivedRawDate));
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
