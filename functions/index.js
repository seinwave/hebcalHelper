const functions = require("firebase-functions");
const { dialogflow, Permission } = require("actions-on-google");
const axios = require("axios");

const userData = (conv) => {
  return conv.user.verification === "VERIFIED" ? conv.user.storage : conv.data;
};
const askForPermission = require("./helper-intents/ask-for-permission");
const app = dialogflow({ debug: true });

function ReadyDate(gregDate, hebDate) {
  (this.gregDate = gregDate), (this.hebDate = hebDate);
}

function dateConverter(params) {
  let receivedRawDate;
  if (typeof params["date-time"] === "string") {
    receivedRawDate = params["date-time"];
  } else if (Object.keys(params["date-time"]).includes("endDateTime")) {
    receivedRawDate = params["date-time"]["endDateTime"];
  } else if (Object.keys(params["date-time"]).includes("startDate")) {
    receivedRawDate = params["date-time"]["startDate"];
  } else {
    receivedRawDate = params["date-time"]["date_time"];
  }

  const gregRaw = new Date(Date.parse(receivedRawDate));
  console.log(gregRaw);
  const gregReady = {};
  gregReady.year = gregRaw.getFullYear();
  // Zero-based indexing of months... how smart!
  gregReady.month = gregRaw.getMonth() + 1;
  gregReady.day = gregRaw.getDate();

  return gregReady;
}

function getHebrewDate(url) {
  return axios.get(url);
}

app.intent("Default Welcome Intent", (conv) => {
  if (conv.device.location !== undefined) {
    conv.ask("Hey there! I'm the Hebrew Calendar. Ask me about Torah parshas, Hebrew dates, Jewish holidays, or candle lighting times!");
  } else {
    conv.ask("Hey there! I'm the Hebrew Calendar. I can help you understand what's going on in the Jewish calendar year.");  
    conv.ask(
      new Permission({
        context: "To tell you precise candle lighting times",
        permissions: ["NAME", "DEVICE_COARSE_LOCATION"],
      })
    );
  }
});


app.intent("request_location_permission", (conv, params, permissionGranted) => {
    if (!permissionGranted) {
      throw new Error("Permission not granted");
    }
    const { requestedPermission } = conv.data;
    if (requestedPermission === "DEVICE_COARSE_LOCATION") {
      userData(conv).location = conv.device.location.city;
    }
    return conv.ask("Thanks! Now I can tell you exactly when to light the candles.")
  });


app.intent("date-ask", (conv) => {
  let gregReady = dateConverter(conv.parameters);
  if (isNaN(gregReady.month)) {
    return conv.ask("I'm sorry - could you please specify a date?");
  } else {
    const hebCalString = `https://www.hebcal.com/converter?cfg=json&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    return getHebrewDate(hebCalString)
      .then((response) => {
        const processedDate = new ReadyDate(gregReady, response.data);
        return conv.ask(
          `It's the ${processedDate.hebDate.hd} of ${processedDate.hebDate.hm}, in the year ${processedDate.hebDate.hy}.`
        );
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

app.intent("candles-ask", (conv) => {

  //todo: figure out how to get cities into hebcal url string
  //todo: https://www.hebcal.com/home/195/jewish-calendar-rest-api
  //todo: geocodes? ZIP? few different avenues to try.
  let gregReady = dateConverter(conv.parameters);
  const { location } = conv.device;
  console.log(conv.device);
  conv.ask("candles!");
});

app.intent("parshas-ask", (conv) => {
  console.log("PARAMETERS:", conv.parameters);
  let gregReady = dateConverter(conv.parameters);
  console.log("GREGORIAN:", gregReady);
  if (isNaN(gregReady.month)) {
    return conv.ask("I'm sorry - could you please specify a date?");
  } else {
    const hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geonameid=3448439&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    return getHebrewDate(hebCalString)
      .then((response) => {
        let item = response.data.items.filter((i) => {
          return Object.keys(i).includes("leyning");
        });
        let filtered = item.filter((i) => {
          return i.leyning.torah !== undefined;
        });
        if (filtered[0].category === "holiday") {
          return conv.ask(
            `The date you're asking about is a holiday — ${filtered[0].title}. The Torah portion is ${filtered[0].leyning.torah}`
          );
        } else {
          return conv.ask(
            `The parsha is ${filtered[0].title}. That's ${filtered[0].leyning.torah}.`
          );
        }
      })
      .catch((error) => {
        console.log("Error");
      });
  }
});



exports.firebaseFulfillment = functions.https.onRequest(app);
