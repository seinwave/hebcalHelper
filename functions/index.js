const functions = require("firebase-functions");
const { dialogflow, Permission } = require("actions-on-google");
const axios = require("axios");

const cities = require("./cities.js");

const userData = (conv) => {
  return conv.user.verification === "VERIFIED" ? conv.user.storage : conv.data;
};

const app = dialogflow({ debug: true });

function addTime(query, date) {
  // todo: let weeks = compromise? use NLP to parse query?
  // todo: let days = weeks / 7;
  // todo: let
  // todo: if (query contains 'weeks') {
  // todo: let weeks = compromise? use NLP to parse query?
  // todo:  let days = weeks / 7;
  // todo: return new Date(date.setDate(date.getDate() + days));}
  
  // todo: else if (query contains 'months') {
  // todo: let months = compromise? use NLP to parse query?
  // todo: return new Date(date.setMonth(date.getMonth()+months));}
  console.log("TIME WILL BE ADDED", query, date);
}

function ReadyDate(gregDate, hebDate) {
  (this.gregDate = gregDate), (this.hebDate = hebDate);
}

function dateConverter(query, params) {
  console.log(params["date-time"]);
  let receivedRawDate;
  if (params["date-period"]) {
    receivedRawDate = params["date-period"]["startDate"];
  } else if (typeof params["date-time"] === "string") {
    receivedRawDate = params["date-time"];
  } else if (Object.keys(params["date-time"]).includes("endDateTime")) {
    if (new Date(params["date-time"]["endDateTime"]) < Date.now()) {
      // todo: make this function do what it says on the tin
      addTime(query, params);
    }
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
  gregReady.month = gregRaw.getMonth() + 1;
  gregReady.day = gregRaw.getDate();

  return gregReady;
}

function getHebrewDate(url) {
  return axios.get(url);
}

app.intent("Default Welcome Intent", (conv) => {
  if (conv.device.location !== undefined) {
    conv.ask(
      "Hey there! I'm the Hebrew Calendar. Ask me about Torah parshas, Hebrew dates, Jewish holidays, or candle lighting times!"
    );
  } else {
    conv.ask(
      "Hey there! I'm the Hebrew Calendar. I can help you understand what's going on in the Jewish calendar year."
    );
    conv.ask(
      new Permission({
        context: "To tell you precise candle lighting times",
        permissions: ["NAME", "DEVICE_PRECISE_LOCATION"],
      })
    );
  }
});

app.intent("request_location_permission", (conv, params, permissionGranted) => {
  if (!permissionGranted) {
    throw new Error("Permission not granted");
  }
  const { requestedPermission } = conv.data;
  if (requestedPermission === "DEVICE_PRECISE_LOCATION") {
    userData(conv).location = conv.device.location;
  }
  return conv.ask(
    "Thanks! Now I can tell you exactly when to light the candles."
  );
});

app.intent("date-ask", (conv) => {
  let gregReady = dateConverter(conv.query, conv.parameters);
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
  let gregReady = dateConverter(conv.query, conv.parameters);
  const { city } = conv.device.location;
  const cityMatches = cities.cities.filter((i) => {
    return i.name === city;
  });
  const geoname = cityMatches[0].geonameid;
  let hebCalString;
  if (geoname !== undefined) {
    hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geoname=${geoname}&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
  } else {
    hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geoname=281184&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
  }
  return getHebrewDate(hebCalString)
    .then((response) => {
      const candleItem = response.data.items.filter((i) =>
        i.title.includes("Candle lighting")
      );
      console.log(candleItem[0]);
      const timeSentence = candleItem[0].title;
      const timeRegEx = /([0-1]?[0-9]|2[0-3]):[0-5][0-9][a-z][a-z]$/gim;
      const time = timeSentence.match(timeRegEx);
      return conv.ask(`Light those things at ${time[0]}.`);
    })
    .catch((error) => {
      console.log(error);
    });
});

app.intent("parshas-ask", (conv) => {
  console.log("PARAMETERS:", conv.parameters, "QUERY:", conv.query);
  let gregReady = dateConverter(conv.query, conv.parameters);
  console.log("GREGORIAN:", gregReady);
  if (isNaN(gregReady.month)) {
    return conv.ask(
      "I'm sorry - could you please try again, with a specific date?"
    );
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
