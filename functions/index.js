const functions = require("firebase-functions");
const { dialogflow, Permission } = require("actions-on-google");
const app = dialogflow({ debug: true });

const we = require("./routes/welcome");
const da = require("./routes/dates");
const ca = require("./routes/candles");
const pa = require("./routes/parshas");
const ho = require("./routes/holidays");
const he = require("./routes/helpers");


app.intent("Default Welcome Intent", (conv) => {
  return we.welcome(conv);
});

app.intent("request_location_permission", (conv, params, permissionGranted) => {
    return he.requestingPermission(conv, permissionGranted);
});

app.intent("date-ask", (conv) => {
  return da.dates(conv);
});

app.intent("candles-ask", (conv) => {
    return ca.candles(conv);
});

app.intent("holidays-ask", (conv) => {
    return ho.holidays(conv);
});

app.intent("parshas-ask", (conv) => {
    return pa.parshas(conv);
  });

exports.firebaseFulfillment = functions.https.onRequest(app);
